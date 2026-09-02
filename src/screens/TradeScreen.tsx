import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatUnits, maxUint256 } from 'viem';

import { ScreenHeader } from '@/components/ScreenHeader';
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
import { useWalletTransaction } from '@/hooks/useWalletTransaction';
import {
  basePublicClient,
  waitForSuccessReceipt,
} from '@/lib/stocks/baseClient';
import {
  encodeApprove,
  formatRawTokenAmount,
  readAllowance,
  waitForAllowance,
} from '@/lib/stocks/erc20';
import { formatUsd } from '@/lib/stocks/fetchQuotes';
import { fetchSwapQuote, formatQuoteAmount, SwapQuoteError } from '@/lib/stocks/lifi';
import { parseAmountInput } from '@/lib/stocks/parseAmount';
import type { RootStackParamList } from '@/navigation/types';

type PickerTarget = 'from' | 'to' | null;
type SwapPhase = 'idle' | 'approving' | 'swapping' | 'done';

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

  const [fromAsset, setFromAsset] = useState(() =>
    defaultFromAsset(route.params?.fromSymbol),
  );
  const [toAsset, setToAsset] = useState(() =>
    defaultToAsset(route.params?.toSymbol, fromAsset),
  );
  const [amount, setAmount] = useState('');
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [phase, setPhase] = useState<SwapPhase>('idle');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const parsedAmount = parseAmountInput(amount, fromAsset.decimals);
  const { raw: fromBalance, refresh: refreshBalance } = useTokenBalance(
    address,
    fromAsset.tokenAddress,
  );

  const sameAsset = fromAsset.id === toAsset.id;
  const exceedsBalance = parsedAmount != null && parsedAmount > fromBalance;
  const canQuote =
    !sameAsset && parsedAmount != null && parsedAmount > 0n && Boolean(address);

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
    setFromAsset(asset);
    setSwapError(null);
    setTxHash(null);
    setPhase('idle');
  };

  const handleSelectTo = (asset: TradeAsset) => {
    if (asset.id === fromAsset.id) {
      setFromAsset(toAsset);
    }
    setToAsset(asset);
    setSwapError(null);
    setTxHash(null);
    setPhase('idle');
  };

  const handleFlip = () => {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
    setSwapError(null);
    setTxHash(null);
    setPhase('idle');
  };

  const handleMax = () => {
    if (fromBalance <= 0n) {
      return;
    }
    setAmount(formatUnits(fromBalance, fromAsset.decimals));
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
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

        <ScreenHeader
          showBrand
          subtitle="Stock-to-stock trades route through USDC on Base DEXs in one transaction."
          title={`${fromAsset.symbol} → ${toAsset.symbol}`}
        />

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>From</Text>
            {address ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleMax}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.balance}>
                  {formatRawTokenAmount(fromBalance, fromAsset.decimals)}{' '}
                  {fromAsset.symbol}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.cardRow}>
            <TextInput
              accessibilityLabel="Amount to sell"
              autoCapitalize="none"
              autoCorrect={false}
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
              style={styles.amountInput}
              value={amount}
            />
            <AssetChip
              asset={fromAsset}
              onPress={() => {
                setPicker('from');
              }}
            />
          </View>
        </View>

        <Pressable
          accessibilityLabel="Flip tokens"
          accessibilityRole="button"
          onPress={handleFlip}
          style={({ pressed }) => [
            styles.flip,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="swap-vertical" size={20} color={colors.brandAccent} />
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>To</Text>
          <View style={styles.cardRow}>
            <Text style={styles.receiveAmount}>
              {quote
                ? formatQuoteAmount(quote.toAmount, quote.toDecimals)
                : isQuoteLoading
                  ? '…'
                  : '—'}
            </Text>
            <AssetChip
              asset={toAsset}
              onPress={() => {
                setPicker('to');
              }}
            />
          </View>
        </View>

        {quote ? (
          <View style={styles.quoteMeta}>
            {quote.toAmountUsd != null ? (
              <Text style={styles.quoteLine}>
                You receive about {formatUsd(quote.toAmountUsd)}
              </Text>
            ) : null}
            <Text style={styles.quoteLine}>
              Min received{' '}
              {formatQuoteAmount(quote.toAmountMin, quote.toDecimals)}{' '}
              {toAsset.symbol}
            </Text>
            <Text style={styles.quoteLine}>Route: {quote.routeLabel}</Text>
          </View>
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
      </ScrollView>

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
    content: {
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
    card: {
      marginTop: 16,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    cardLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    balance: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.brandAccent,
    },
    cardRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    amountInput: {
      flex: 1,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      padding: 0,
      minWidth: 0,
    },
    receiveAmount: {
      flex: 1,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      minWidth: 0,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.background,
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
    flip: {
      alignSelf: 'center',
      marginTop: 12,
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quoteMeta: {
      marginTop: 14,
      gap: 4,
    },
    quoteLine: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    error: {
      marginTop: 12,
      fontSize: 14,
      lineHeight: 20,
      color: colors.error,
    },
    hint: {
      marginTop: 12,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    link: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '600',
      color: colors.brandAccent,
    },
    button: {
      marginTop: 24,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      backgroundColor: colors.brand,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
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
