import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maxUint256 } from 'viem';

import { AssetChip } from '@/components/AssetChip';
import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useMinSwapUsd } from '@/hooks/useMinSwapUsd';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useTokenizedStockQuotes } from '@/hooks/useTokenizedStockQuotes';
import { useWalletTransaction } from '@/hooks/useWalletTransaction';
import {
  basePublicClient,
  waitForSuccessReceipt,
} from '@/lib/stocks/baseClient';
import {
  encodeApprove,
  readAllowance,
  waitForAllowance,
} from '@/lib/stocks/erc20';
import { formatUsd } from '@/lib/stocks/fetchQuotes';
import { fetchSwapQuote, formatQuoteAmount } from '@/lib/stocks/lifi';
import {
  parseAmountInput,
  parseUsdInput,
  tokenAmountToUsd,
  usdInputToTokenAmount,
} from '@/lib/stocks/parseAmount';
import {
  assetPriceUsd,
  defaultFromAsset,
  defaultToAsset,
  inputAssetUsdValue,
  isBelowMinSwapUsd,
  swapErrorMessage,
} from '@/lib/stocks/trade';
import type { RootStackParamList } from '@/navigation/types';

type SwapPhase = 'idle' | 'approving' | 'swapping' | 'done';

export function TradeConfirmScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'tradeConfirm'>>();
  const { isAuthenticated } = useAuth();
  const minSwapUsd = useMinSwapUsd();
  const { address, sendTransaction } = useWalletTransaction();
  const { quotes } = useTokenizedStockQuotes();

  const fromAsset = defaultFromAsset(route.params.fromSymbol);
  const toAsset = defaultToAsset(route.params.toSymbol, fromAsset);
  const amount = route.params.amount;
  const inputUnit = route.params.inputUnit;
  const amountAsUsd = inputUnit === 'usd';
  const fromPriceUsd = assetPriceUsd(fromAsset, quotes);
  const convertedAmount = amountAsUsd
    ? usdInputToTokenAmount(amount, fromAsset.decimals, fromPriceUsd)
    : parseAmountInput(amount, fromAsset.decimals);
  const parsedUsd = amountAsUsd
    ? parseUsdInput(amount)
    : convertedAmount == null
      ? null
      : tokenAmountToUsd(convertedAmount, fromAsset.decimals, fromPriceUsd);
  const { raw: fromBalance, refresh: refreshBalance } = useTokenBalance(
    address,
    fromAsset.tokenAddress,
  );
  const fromBalanceUsd = useMemo(
    () => inputAssetUsdValue(fromAsset, fromBalance, quotes),
    [fromAsset, fromBalance, quotes],
  );

  const sameAsset = fromAsset.id === toAsset.id;
  const exceedsBalance = amountAsUsd
    ? parsedUsd != null &&
    fromBalanceUsd != null &&
    parsedUsd > fromBalanceUsd + 0.005
    : convertedAmount != null && convertedAmount > fromBalance;
  const parsedAmount =
    convertedAmount == null || exceedsBalance
      ? convertedAmount
      : convertedAmount > fromBalance
        ? fromBalance
        : convertedAmount;
  const passedQuote = route.params.quote ?? null;
  const canQuote =
    passedQuote == null &&
    !sameAsset &&
    parsedAmount != null &&
    parsedAmount > 0n &&
    Boolean(address) &&
    !exceedsBalance;

  const [phase, setPhase] = useState<SwapPhase>('idle');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string | null>(null);

  const { quote: fetchedQuote, errorMessage: quoteError, isLoading: isQuoteLoading } =
    useSwapQuote({
      fromToken: fromAsset.tokenAddress,
      toToken: toAsset.tokenAddress,
      fromAmount: parsedAmount,
      fromAddress: address,
      enabled: canQuote && phase === 'idle',
    });

  const toAmount = passedQuote
    ? BigInt(passedQuote.toAmount)
    : fetchedQuote?.toAmount ?? null;
  const toDecimals = passedQuote?.toDecimals ?? fetchedQuote?.toDecimals;
  const payUsd =
    passedQuote?.fromAmountUsd ?? fetchedQuote?.fromAmountUsd ?? parsedUsd;

  const payLabel = payUsd != null ? formatUsd(payUsd) : '$0.00';
  const paySharesLabel =
    fromAsset.kind === 'stock'
      ? `${formatQuoteAmount(convertedAmount ?? 0n, fromAsset.decimals)} shares`
      : null;
  const receiveLabel =
    toAmount != null && toDecimals != null
      ? `${formatQuoteAmount(toAmount, toDecimals)}${
          toAsset.kind === 'stock' ? ' shares' : ` ${toAsset.symbol}`
        }`
      : isQuoteLoading
        ? 'Getting a quote…'
        : address
          ? '—'
          : 'Sign in to see a quote';

  const handleSwap = async () => {
    if (!isAuthenticated) {
      navigation.navigate('login');
      return;
    }
    if (!address || !parsedAmount || parsedAmount <= 0n || sameAsset) {
      return;
    }
    if (exceedsBalance) {
      setSwapError(`Not enough ${fromAsset.symbol}.`);
      return;
    }
    if (minSwapUsd == null) {
      return;
    }
    if (isBelowMinSwapUsd(parsedUsd, minSwapUsd)) {
      setSwapError(`Minimum swap is ${formatUsd(minSwapUsd)}.`);
      return;
    }

    setSwapError(null);
    setReceivedAmount(null);

    try {
      let nextQuote = await fetchSwapQuote({
        fromToken: fromAsset.tokenAddress,
        toToken: toAsset.tokenAddress,
        fromAmount: parsedAmount,
        fromAddress: address,
      });

      const allowance = await readAllowance(
        fromAsset.tokenAddress,
        address,
        nextQuote.approvalAddress,
      );

      if (allowance < nextQuote.fromAmount) {
        setPhase('approving');
        const approveHash = await sendTransaction({
          to: fromAsset.tokenAddress,
          data: encodeApprove(nextQuote.approvalAddress, maxUint256),
          value: 0n,
        });
        await waitForSuccessReceipt(approveHash, 2);
        await waitForAllowance(
          fromAsset.tokenAddress,
          address,
          nextQuote.approvalAddress,
          nextQuote.fromAmount,
        );
        nextQuote = await fetchSwapQuote({
          fromToken: fromAsset.tokenAddress,
          toToken: toAsset.tokenAddress,
          fromAmount: parsedAmount,
          fromAddress: address,
        });
      }

      setPhase('swapping');
      await basePublicClient.call({
        account: address,
        to: nextQuote.transaction.to,
        data: nextQuote.transaction.data,
        value: nextQuote.transaction.value,
      });

      const hash = await sendTransaction(nextQuote.transaction);
      await waitForSuccessReceipt(hash);
      setReceivedAmount(
        formatQuoteAmount(nextQuote.toAmount, nextQuote.toDecimals),
      );
      setPhase('done');
      void refreshBalance();
    } catch (error) {
      console.error(error);
      setPhase('idle');
      setSwapError(swapErrorMessage(error));
    }
  };

  const submitDisabled =
    minSwapUsd == null ||
    phase === 'approving' ||
    phase === 'swapping' ||
    (isAuthenticated && !address) ||
    (isAuthenticated &&
      (sameAsset ||
        parsedAmount == null ||
        parsedAmount <= 0n ||
        exceedsBalance ||
        (toAmount == null && !quoteError)));

  const submitLabel =
    isAuthenticated && !address
      ? 'No wallet linked'
      : phase === 'approving'
        ? 'Approving'
        : phase === 'swapping'
          ? 'Swapping'
          : 'Submit';

  const handleDone = () => {
    setPhase('idle');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'main', params: { screen: 'home' } }],
      }),
    );
  };

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.frame,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => {
              navigation.goBack();
            }}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.summary}>
          <View
            accessibilityLabel={
              paySharesLabel
                ? `You pay ${payLabel}, ${paySharesLabel}`
                : `You pay ${payLabel}`
            }
            style={styles.leg}
          >
            <Text numberOfLines={1} style={styles.legAmount}>
              {payLabel}
            </Text>
            {paySharesLabel ? (
              <Text style={styles.legShares}>{paySharesLabel}</Text>
            ) : null}
            <AssetChip asset={fromAsset} />
          </View>

          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={styles.routeArrow}
          >
            <Ionicons color={colors.textMuted} name="arrow-down" size={20} />
          </View>

          <View
            accessibilityLabel={`You receive ${receiveLabel}`}
            style={styles.leg}
          >
            <Text numberOfLines={1} style={styles.legAmount}>
              {receiveLabel}
            </Text>
            <AssetChip asset={toAsset} />
          </View>
        </View>

        <View style={styles.bottom}>
          {exceedsBalance && address ? (
            <Text style={styles.error}>Not enough {fromAsset.symbol}.</Text>
          ) : null}
          {sameAsset ? (
            <Text style={styles.error}>Pick two different assets.</Text>
          ) : null}
          {quoteError ? <Text style={styles.error}>{quoteError}</Text> : null}
          {swapError ? <Text style={styles.error}>{swapError}</Text> : null}

          {isAuthenticated && !address ? (
            <Text style={styles.hint}>
              No wallet is linked to this account yet.
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={submitDisabled}
            onPress={() => {
              void handleSwap();
            }}
            style={({ pressed }) => [
              styles.button,
              submitDisabled && styles.buttonDisabled,
              pressed && !submitDisabled && styles.buttonPressed,
            ]}
          >
            {phase === 'approving' || phase === 'swapping' ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.buttonText}>{submitLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={handleDone}
        transparent
        visible={phase === 'done'}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <View
              accessibilityLabel={
                receivedAmount
                  ? `Congrats! You've received ${receivedAmount}${
                      toAsset.kind === 'stock' ? ' shares' : ''
                    } ${toAsset.symbol}`
                  : `Congrats! You've received ${toAsset.symbol}`
              }
              style={styles.successLine}
            >
              <Text style={styles.modalBody}>Congrats! You've received</Text>
              {receivedAmount ? (
                <Text style={styles.successAmount}>
                  {toAsset.kind === 'stock'
                    ? `${receivedAmount} shares`
                    : receivedAmount}
                </Text>
              ) : null}
              <AssetChip asset={toAsset} />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleDone}
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    frame: {
      flex: 1,
      paddingHorizontal: 24,
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    header: {
      marginLeft: -8,
      alignItems: 'flex-start',
    },
    back: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    pressed: {
      opacity: 0.7,
    },
    summary: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 36,
      gap: 16,
    },
    leg: {
      alignItems: 'center',
      gap: 10,
    },
    legAmount: {
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -1.2,
      color: colors.text,
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
    },
    legShares: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    routeArrow: {
      paddingVertical: 2,
    },
    bottom: {
      gap: 10,
      paddingTop: 12,
    },
    error: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.error,
      paddingHorizontal: 4,
    },
    hint: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      paddingHorizontal: 4,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    successLine: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
    },
    modalBody: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    successAmount: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    modalButton: {
      marginTop: 20,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      backgroundColor: colors.brand,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    button: {
      marginTop: 6,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      backgroundColor: colors.brand,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonText: {
      color: colors.onBrand,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
