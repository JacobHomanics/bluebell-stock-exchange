import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StockRow } from '@/components/StockRow';
import type { AppThemeColors } from '@/constants/theme';
import { USDC_ON_BASE } from '@/constants/tradeAssets';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTokenizedStockPortfolio } from '@/hooks/useTokenizedStockPortfolio';
import { formatShares } from '@/lib/stocks/fetchBalances';
import { formatUsd, type StockQuote } from '@/lib/stocks/fetchQuotes';
import type { RootStackParamList } from '@/navigation/types';

const USDC_QUOTE: StockQuote = {
  symbol: USDC_ON_BASE.symbol,
  name: USDC_ON_BASE.name,
  logoUri: USDC_ON_BASE.logoUri,
  tokenAddress: USDC_ON_BASE.tokenAddress,
  priceUsd: 1,
  updatedAt: null,
};

export function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    owner,
    isAuthenticated,
    positions,
    usdcAmount,
    totalUsd,
    errorMessage,
    isLoading,
    isRefreshing,
    refresh,
  } = useTokenizedStockPortfolio();

  const caption = !isAuthenticated
    ? 'Sign in to see holdings of Coinbase B20 tokens.'
    : !owner
      ? 'No wallet is linked to this account yet.'
      : positions.length === 0 && usdcAmount === 0
        ? 'No tokenized stocks or USDC in this wallet yet. Browse Explore to see supported names.'
        : 'USDC and Coinbase B20 tokens in your wallet.';

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      refreshControl={
        <RefreshControl
          onRefresh={refresh}
          refreshing={isRefreshing}
          tintColor={colors.brandAccent}
        />
      }
      style={styles.root}
    >
      <Text style={styles.kicker}>Portfolio</Text>
      <Text style={styles.title}>Home</Text>

      <View
        accessibilityLabel={
          owner
            ? `Balance ${formatUsd(totalUsd)}, ${formatUsd(usdcAmount)} USDC`
            : `Balance ${formatUsd(totalUsd)}`
        }
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Balance</Text>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading balance</Text>
          </View>
        ) : (
          <>
            <Text style={styles.balanceValue}>{formatUsd(totalUsd)}</Text>
            {owner ? (
              <Text style={styles.usdcLine}>
                {formatUsd(usdcAmount)} USDC
              </Text>
            ) : null}
          </>
        )}
        <Text style={styles.caption}>{caption}</Text>
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {owner ? (
        <View style={styles.list}>
          <StockRow
            detail="Cash"
            onPress={() => {
              navigation.getParent()?.navigate('trade', {
                fromSymbol: 'USDC',
              });
            }}
            quote={USDC_QUOTE}
            valueLabel={formatUsd(usdcAmount)}
          />
          {positions.map((holding) => (
            <StockRow
              key={holding.quote.symbol}
              detail={`${formatShares(holding.amount)} shares`}
              onPress={() => {
                navigation.getParent()?.navigate('trade', {
                  fromSymbol: holding.quote.symbol,
                  toSymbol: 'USDC',
                });
              }}
              quote={holding.quote}
              valueLabel={
                holding.valueUsd == null ? '—' : formatUsd(holding.valueUsd)
              }
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
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
    kicker: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.brandAccent,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      marginTop: 8,
      color: colors.text,
    },
    balanceCard: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    balanceLabel: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    balanceValue: {
      marginTop: 8,
      fontSize: 36,
      fontWeight: '700',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    usdcLine: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    caption: {
      marginTop: 10,
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
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    list: {
      marginTop: 20,
      gap: 10,
    },
  });
}
