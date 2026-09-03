import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatUnits, maxUint256 } from 'viem';

import { TokenPicker } from '@/components/TokenPicker';
import type { AppThemeColors } from '@/constants/theme';
import {
  getTradeAsset,
  TRADE_ASSETS,
  USDC_ON_BASE,
  type TradeAsset,
} from '@/constants/tradeAssets';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
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
import { formatUsd, type StockQuote } from '@/lib/stocks/fetchQuotes';
import { fetchSwapQuote, formatQuoteAmount, SwapQuoteError } from '@/lib/stocks/lifi';
import {
  formatTokenAmountInput,
  formatUsdAmountInput,
  parseAmountInput,
  parseUsdInput,
  tokenAmountToUsd,
  usdInputToTokenAmount,
} from '@/lib/stocks/parseAmount';
import type { RootStackParamList } from '@/navigation/types';

type PickerTarget = 'from' | 'to' | null;
type SwapPhase = 'idle' | 'approving' | 'swapping' | 'done';
type InputUnit = 'usd' | 'token';

function defaultFromAsset(fromSymbol?: string): TradeAsset {
  return getTradeAsset(fromSymbol) ?? USDC_ON_BASE;
}

function swapErrorMessage(error: unknown): string {
  if (error instanceof SwapQuoteError) {
    return error.message;
  }

  const text = error instanceof Error ? error.message : String(error);
  if (text.includes('TRANSFER_FROM_FAILED')) {
    return 'Token approval is not live yet. Wait a moment and try again.';
  }
  if (text.includes('Transaction reverted')) {
    return 'The swap transaction reverted. Try a fresh quote.';
  }

  return 'Swap failed. Check gas, allowance, and try again.';
}

function inputAssetUsdValue(
  asset: TradeAsset,
  rawBalance: bigint,
  quotes: readonly StockQuote[],
): number | null {
  const amount = Number(formatUnits(rawBalance, asset.decimals));
  if (!Number.isFinite(amount)) {
    return null;
  }
  if (asset.kind === 'cash') {
    return amount;
  }

  const quote = quotes.find((item) => item.symbol === asset.symbol);
  if (quote?.priceUsd == null) {
    return null;
  }

  return amount * quote.priceUsd;
}

function assetPriceUsd(
  asset: TradeAsset,
  quotes: readonly StockQuote[],
): number | null {
  if (asset.kind === 'cash') {
    return 1;
  }

  return quotes.find((item) => item.symbol === asset.symbol)?.priceUsd ?? null;
}

function defaultToAsset(toSymbol?: string, fromAsset?: TradeAsset): TradeAsset {
  const requested = getTradeAsset(toSymbol);
  if (requested && requested.id !== fromAsset?.id) {
    return requested;
  }

  const fallback = TRADE_ASSETS.find(
    (asset) => asset.kind === 'stock' && asset.id !== fromAsset?.id,
  );
  return fallback ?? TRADE_ASSETS[1] ?? USDC_ON_BASE;
}

export function TradeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'trade'>>();
  const { isAuthenticated } = useAuth();
  const { address, sendTransaction } = useWalletTransaction();
  const { quotes } = useTokenizedStockQuotes();
  const amountInputRef = useRef<TextInput>(null);

  const [fromAsset, setFromAsset] = useState(() =>
    defaultFromAsset(route.params?.fromSymbol),
  );
  const [toAsset, setToAsset] = useState(() =>
    defaultToAsset(route.params?.toSymbol, fromAsset),
  );
  const [amount, setAmount] = useState('');
  const [inputUnit, setInputUnit] = useState<InputUnit>('usd');
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [phase, setPhase] = useState<SwapPhase>('idle');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const fromPriceUsd = assetPriceUsd(fromAsset, quotes);
  const fromIsStock = fromAsset.kind === 'stock';
  const amountAsUsd = inputUnit === 'usd';
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
  const canQuote =
    !sameAsset &&
    parsedAmount != null &&
    parsedAmount > 0n &&
    Boolean(address) &&
    !exceedsBalance;

  const { quote, errorMessage: quoteError, isLoading: isQuoteLoading } =
    useSwapQuote({
      fromToken: fromAsset.tokenAddress,
      toToken: toAsset.tokenAddress,
      fromAmount: parsedAmount,
      fromAddress: address,
      enabled: canQuote && phase === 'idle',
    });

  const handleSelectFrom = (asset: TradeAsset) => {
    if (asset.id === toAsset.id) {
      setToAsset(fromAsset);
    }
    if (asset.kind !== 'stock') {
      setInputUnit('usd');
    }
    setFromAsset(asset);
    setSwapError(null);
    setTxHash(null);
    setPhase('idle');
  };

  const handleSelectTo = (asset: TradeAsset) => {
    if (asset.id === fromAsset.id) {
      if (toAsset.kind !== 'stock') {
        setInputUnit('usd');
      }
      setFromAsset(toAsset);
    }
    setToAsset(asset);
    setSwapError(null);
    setTxHash(null);
    setPhase('idle');
  };

  const handleMax = () => {
    if (amountAsUsd) {
      if (fromBalanceUsd == null || fromBalanceUsd <= 0) {
        return;
      }
      setAmount(formatUsdAmountInput(fromBalanceUsd));
      return;
    }
    if (fromBalance <= 0n) {
      return;
    }
    setAmount(formatTokenAmountInput(fromBalance, fromAsset.decimals));
  };

  const handleToggleUnit = () => {
    if (!fromIsStock) {
      return;
    }
    if (amountAsUsd) {
      if (convertedAmount != null) {
        setAmount(formatTokenAmountInput(convertedAmount, fromAsset.decimals));
      }
      setInputUnit('token');
    } else {
      if (parsedUsd != null) {
        setAmount(formatUsdAmountInput(parsedUsd));
      }
      setInputUnit('usd');
    }
    setPhase('idle');
    setTxHash(null);
    setSwapError(null);
  };

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

    setSwapError(null);
    setTxHash(null);

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
      setTxHash(hash);
      setPhase('done');
      void refreshBalance();
    } catch (error) {
      console.error(error);
      setPhase('idle');
      setSwapError(swapErrorMessage(error));
    }
  };

  const primaryDisabled =
    phase === 'approving' ||
    phase === 'swapping' ||
    (isAuthenticated && !address) ||
    (isAuthenticated &&
      (sameAsset ||
        parsedAmount == null ||
        parsedAmount <= 0n ||
        exceedsBalance ||
        (!quote && !quoteError)));

  const primaryLabel = !isAuthenticated
    ? 'Sign in to swap'
    : !address
      ? 'No wallet linked'
      : phase === 'approving'
        ? 'Approving'
        : phase === 'swapping'
          ? 'Swapping'
          : `Swap ${fromAsset.symbol} for ${toAsset.symbol}`;

  const receiveAmount = quote
    ? formatQuoteAmount(quote.toAmount, quote.toDecimals)
    : isQuoteLoading
      ? '…'
      : '0';
  const inputSecondaryLabel = !fromIsStock
    ? null
    : amountAsUsd
      ? convertedAmount != null
        ? `${formatQuoteAmount(convertedAmount, fromAsset.decimals)} ${fromAsset.symbol}`
        : null
      : parsedUsd != null
        ? formatUsd(parsedUsd)
        : null;
  const balancePrimaryLabel = amountAsUsd
    ? fromBalanceUsd == null
      ? '—'
      : formatUsd(fromBalanceUsd)
    : `${formatQuoteAmount(fromBalance, fromAsset.decimals)} ${fromAsset.symbol}`;
  const balanceSecondaryLabel = !fromIsStock
    ? null
    : amountAsUsd
      ? `${formatQuoteAmount(fromBalance, fromAsset.decimals)} ${fromAsset.symbol}`
      : fromBalanceUsd == null
        ? '—'
        : formatUsd(fromBalanceUsd);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
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

        <View style={styles.paySection}>
          <Pressable
            accessibilityRole="none"
            onPress={() => {
              amountInputRef.current?.focus();
            }}
            style={styles.amountRow}
          >
            {amountAsUsd ? (
              <Text
                style={[
                  styles.currencySign,
                  !amount && styles.currencySignMuted,
                ]}
              >
                $
              </Text>
            ) : null}
            <TextInput
              accessibilityLabel={
                amountAsUsd ? 'Amount in USD' : `Amount in ${fromAsset.symbol}`
              }
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={phase === 'idle' || phase === 'done'}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                setAmount(value.replace(/,/g, ''));
                setPhase('idle');
                setTxHash(null);
                setSwapError(null);
              }}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              ref={amountInputRef}
              style={[
                styles.amountInput,
                { width: Math.max((amount || '0').length, 1) * 34 },
              ]}
              value={amount}
            />
          </Pressable>
          {fromIsStock ? (
            <View style={styles.unitRow}>
              {inputSecondaryLabel ? (
                <Text style={styles.stockHint}>{inputSecondaryLabel}</Text>
              ) : null}
              <Pressable
                accessibilityLabel={
                  amountAsUsd
                    ? `Enter ${fromAsset.symbol} amount`
                    : 'Enter USD amount'
                }
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleToggleUnit}
                style={({ pressed }) => [
                  styles.unitSwitch,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="swap-vertical"
                  size={16}
                  color={colors.brandAccent}
                />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.fromAsset}>
            <AssetChip
              asset={fromAsset}
              onPress={() => {
                setPicker('from');
              }}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleMax}
            style={({ pressed }) => [
              styles.balanceHit,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.balanceRow}>
              <Text style={styles.balance}>{balancePrimaryLabel}</Text>
              <Text style={styles.maxLabel}>Max</Text>
            </View>
            {balanceSecondaryLabel ? (
              <Text style={[styles.stockHint, styles.balanceSecondary]}>
                {balanceSecondaryLabel}
              </Text>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.bottom}>
          <View style={styles.receiveCard}>
            <View style={styles.receiveCopy}>
              <Text style={styles.receiveLabel}>You receive</Text>
              <Text
                numberOfLines={1}
                style={styles.receiveAmount}
              >
                {receiveAmount}
              </Text>
              {quote?.toAmountUsd != null ? (
                <Text style={styles.receiveUsd}>
                  About {formatUsd(quote.toAmountUsd)}
                </Text>
              ) : null}
            </View>
            <AssetChip
              asset={toAsset}
              onPress={() => {
                setPicker('to');
              }}
            />
          </View>

          {quote ? (
            <Text style={styles.quoteLine}>
              Min {formatQuoteAmount(quote.toAmountMin, quote.toDecimals)}{' '}
              {toAsset.symbol}
              {' · '}
              {quote.routeLabel}
            </Text>
          ) : null}

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

          {phase === 'done' && txHash ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(`https://basescan.org/tx/${txHash}`);
              }}
            >
              <Text style={styles.link}>View on Basescan</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={primaryDisabled}
            onPress={() => {
              void handleSwap();
            }}
            style={({ pressed }) => [
              styles.button,
              primaryDisabled && styles.buttonDisabled,
              pressed && !primaryDisabled && styles.buttonPressed,
            ]}
          >
            {phase === 'approving' || phase === 'swapping' ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.buttonText}>{primaryLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <TokenPicker
        assets={TRADE_ASSETS}
        onClose={() => {
          setPicker(null);
        }}
        onSelect={picker === 'from' ? handleSelectFrom : handleSelectTo}
        selectedId={picker === 'to' ? toAsset.id : fromAsset.id}
        title={picker === 'to' ? 'Receive' : 'Pay with'}
        visible={picker != null}
      />
    </KeyboardAvoidingView>
  );
}

function AssetChip({
  asset,
  onPress,
}: {
  asset: TradeAsset;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Pressable
      accessibilityLabel={`Select ${asset.symbol}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      {logoFailed ? (
        <View style={styles.chipFallback}>
          <Text style={styles.chipFallbackText}>{asset.symbol.slice(0, 1)}</Text>
        </View>
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          onError={() => {
            setLogoFailed(true);
          }}
          source={{ uri: asset.logoUri }}
          style={styles.chipLogo}
        />
      )}
      <Text style={styles.chipSymbol}>{asset.symbol}</Text>
      <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
    </Pressable>
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
    paySection: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 28,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencySign: {
      fontSize: 56,
      fontWeight: '700',
      letterSpacing: -1.5,
      color: colors.text,
    },
    currencySignMuted: {
      color: colors.textMuted,
    },
    amountInput: {
      fontSize: 56,
      fontWeight: '700',
      letterSpacing: -1.5,
      color: colors.text,
      padding: 0,
      fontVariant: ['tabular-nums'],
    },
    fromAsset: {
      marginTop: 20,
    },
    balanceHit: {
      marginTop: 14,
      alignItems: 'center',
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    balance: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    maxLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.brandAccent,
    },
    stockHint: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    unitRow: {
      marginTop: 4,
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    unitSwitch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    balanceSecondary: {
      marginTop: 4,
    },
    bottom: {
      gap: 10,
    },
    receiveCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    receiveCopy: {
      flex: 1,
      minWidth: 0,
    },
    receiveLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    receiveAmount: {
      marginTop: 4,
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    receiveUsd: {
      marginTop: 2,
      fontSize: 13,
      color: colors.textSecondary,
    },
    quoteLine: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      paddingHorizontal: 4,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    chipLogo: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    chipFallback: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
    },
    chipFallbackText: {
      color: colors.onBrand,
      fontSize: 12,
      fontWeight: '700',
    },
    chipSymbol: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
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
    link: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.brandAccent,
      paddingHorizontal: 4,
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
