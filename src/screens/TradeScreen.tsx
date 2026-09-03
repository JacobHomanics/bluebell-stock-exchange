import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetChip } from '@/components/AssetChip';
import { NumericKeypad } from '@/components/NumericKeypad';
import { TokenPicker } from '@/components/TokenPicker';
import type { AppThemeColors } from '@/constants/theme';
import { TRADE_ASSETS, type TradeAsset } from '@/constants/tradeAssets';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useTokenizedStockQuotes } from '@/hooks/useTokenizedStockQuotes';
import { useWalletTransaction } from '@/hooks/useWalletTransaction';
import { formatUsd } from '@/lib/stocks/fetchQuotes';
import { formatQuoteAmount, toSwapQuoteSnapshot } from '@/lib/stocks/lifi';
import {
  applyAmountKey,
  formatTokenAmountInput,
  formatUsdAmountInput,
  parseAmountInput,
  parseUsdInput,
  tokenAmountToUsd,
  USD_INPUT_DECIMALS,
  usdInputToTokenAmount,
  type AmountKeypadKey,
} from '@/lib/stocks/parseAmount';
import {
  assetPriceUsd,
  defaultFromAsset,
  defaultToAsset,
  inputAssetUsdValue,
  type TradeInputUnit,
} from '@/lib/stocks/trade';
import type { RootStackParamList } from '@/navigation/types';

type PickerTarget = 'from' | 'to' | null;

export function TradeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'trade'>>();
  const { isAuthenticated } = useAuth();
  const { address } = useWalletTransaction();
  const { quotes } = useTokenizedStockQuotes();

  const [fromAsset, setFromAsset] = useState(() =>
    defaultFromAsset(route.params?.fromSymbol),
  );
  const [toAsset, setToAsset] = useState(() =>
    defaultToAsset(route.params?.toSymbol, fromAsset),
  );
  const [amount, setAmount] = useState('');
  const [inputUnit, setInputUnit] = useState<TradeInputUnit>('usd');
  const [picker, setPicker] = useState<PickerTarget>(null);

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
  const { raw: fromBalance } = useTokenBalance(
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

  const { quote, errorMessage: quoteError } =
    useSwapQuote({
      fromToken: fromAsset.tokenAddress,
      toToken: toAsset.tokenAddress,
      fromAmount: parsedAmount,
      fromAddress: address,
      enabled: canQuote,
    });

  const handleSelectFrom = (asset: TradeAsset) => {
    if (asset.id === toAsset.id) {
      setToAsset(fromAsset);
    }
    if (asset.kind !== 'stock') {
      setInputUnit('usd');
    }
    setFromAsset(asset);
  };

  const handleSelectTo = (asset: TradeAsset) => {
    if (asset.id === fromAsset.id) {
      if (toAsset.kind !== 'stock') {
        setInputUnit('usd');
      }
      setFromAsset(toAsset);
    }
    setToAsset(asset);
  };

  const amountDecimals = amountAsUsd ? USD_INPUT_DECIMALS : fromAsset.decimals;

  const handleAmountKey = useCallback(
    (key: AmountKeypadKey) => {
      setAmount((current) => applyAmountKey(current, key, amountDecimals));
    },
    [amountDecimals],
  );

  const handleAmountClear = useCallback(() => {
    setAmount('');
  }, []);

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
  };

  const handleReview = () => {
    if (reviewDisabled) {
      return;
    }
    navigation.navigate('tradeConfirm', {
      fromSymbol: fromAsset.symbol,
      toSymbol: toAsset.symbol,
      amount,
      inputUnit,
      quote: quote ? toSwapQuoteSnapshot(quote) : null,
    });
  };

  const reviewDisabled =
    sameAsset ||
    parsedAmount == null ||
    parsedAmount <= 0n ||
    (Boolean(address) && exceedsBalance) ||
    (isAuthenticated && !address);

  const reviewLabel =
    isAuthenticated && !address ? 'No wallet linked' : 'Review';

  const inputSecondaryLabel = !fromIsStock
    ? null
    : amountAsUsd
      ? `${formatQuoteAmount(convertedAmount ?? 0n, fromAsset.decimals)} shares`
      : formatUsd(parsedUsd ?? 0);
  const balancePrimaryLabel = amountAsUsd
    ? fromBalanceUsd == null
      ? '—'
      : `${formatUsd(fromBalanceUsd)} available`
    : `${formatQuoteAmount(fromBalance, fromAsset.decimals)} shares available`;

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

        <View style={styles.paySection}>
          <View
            accessibilityLabel={
              amountAsUsd ? 'Amount in USD' : `Amount in ${fromAsset.symbol}`
            }
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
            <Text
              selectable={false}
              style={[styles.amountValue, !amount && styles.currencySignMuted]}
            >
              {amount || '0'}
            </Text>
          </View>
          {fromIsStock ? (
            <View style={styles.unitRow}>
              <Text style={styles.stockHint}>{inputSecondaryLabel}</Text>
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
          </Pressable>

          <View style={styles.route}>
            <AssetChip
              asset={fromAsset}
              onPress={() => {
                setPicker('from');
              }}
            />
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={styles.routeArrow}
            >
              <Ionicons
                color={colors.textMuted}
                name="arrow-down"
                size={20}
              />
            </View>
            <AssetChip
              asset={toAsset}
              onPress={() => {
                setPicker('to');
              }}
            />
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

          {isAuthenticated && !address ? (
            <Text style={styles.hint}>
              No wallet is linked to this account yet.
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={reviewDisabled}
            onPress={handleReview}
            style={({ pressed }) => [
              styles.button,
              reviewDisabled && styles.buttonDisabled,
              pressed && !reviewDisabled && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{reviewLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.keypadSlot}>
          <NumericKeypad
            captureHardwareKeys={picker == null}
            onClear={handleAmountClear}
            onKey={handleAmountKey}
          />
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
    paySection: {
      alignItems: 'center',
      paddingTop: 40,
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
    amountValue: {
      fontSize: 56,
      fontWeight: '700',
      letterSpacing: -1.5,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    route: {
      marginTop: 14,
      alignItems: 'center',
      gap: 8,
    },
    routeArrow: {
      paddingVertical: 2,
    },
    balanceHit: {
      marginTop: 20,
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
    keypadSlot: {
      flex: 1,
      width: '100%',
      minHeight: 0,
      paddingVertical: 8,
      overflow: 'hidden',
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
