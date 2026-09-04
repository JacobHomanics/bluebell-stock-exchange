import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceChart } from '@/components/BalanceChart';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StockRow } from '@/components/StockRow';
import type { AppThemeColors } from '@/constants/theme';
import { USDC_ON_BASE } from '@/constants/tradeAssets';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTokenizedStockPortfolio } from '@/hooks/useTokenizedStockPortfolio';
import { useUsdcOnramp } from '@/hooks/useUsdcOnramp';
import { formatShares } from '@/lib/stocks/fetchBalances';
import { formatUsd } from '@/lib/stocks/fetchQuotes';
import type { RootStackParamList } from '@/navigation/types';

const HOME_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'pie-chart-outline',
    iconSelected: 'pie-chart',
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: 'list-outline',
    iconSelected: 'list',
  },
] as const;

type HomeTabId = (typeof HOME_TABS)[number]['id'];

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
    balanceHistory,
    errorMessage,
    isLoading,
    isRefreshing,
    refresh,
  } = useTokenizedStockPortfolio();
  const { startOnramp } = useUsdcOnramp();
  const [infoVisible, setInfoVisible] = useState(false);
  const [usdcLogoFailed, setUsdcLogoFailed] = useState(false);
  const [homeTab, setHomeTab] = useState<HomeTabId>('overview');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (isDepositing) {
      return;
    }

    if (!isAuthenticated) {
      navigation.getParent()?.navigate('login');
      return;
    }

    if (!owner) {
      setDepositError('No wallet is linked to this account yet.');
      return;
    }

    setDepositError(null);
    setIsDepositing(true);

    try {
      await startOnramp(owner);
      refresh();
    } catch (error) {
      console.error(error);
      if (!isOnrampClosedError(error)) {
        setDepositError('Could not start deposit. Please try again.');
      }
    } finally {
      setIsDepositing(false);
    }
  };

  const portfolioCaption = !isAuthenticated
    ? 'Sign in to see holdings of Coinbase B20 tokens.'
    : !owner
      ? 'No wallet is linked to this account yet.'
      : !isLoading && positions.length === 0
        ? 'No tokenized stocks in this wallet yet. Browse Explore to see supported names.'
        : null;

  return (
    <>
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
        <ScreenHeader title="Home" />

        <View style={styles.tabs}>
          <SegmentedTabs
            accessibilityLabel="Home sections"
            onChange={setHomeTab}
            tabs={HOME_TABS}
            value={homeTab}
          />
        </View>

        {homeTab === 'overview' ? (
          <View style={styles.tabPanel}>
            <View style={styles.balanceCard}>
              <View>
                <View style={styles.balanceHeader}>
                  <View style={styles.balanceTitle}>
                    <Text style={styles.balanceLabel}>Balance</Text>
                    <Pressable
                      accessibilityLabel="About this balance"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => {
                        setInfoVisible(true);
                      }}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Ionicons
                        color={colors.textMuted}
                        name="information-circle-outline"
                        size={20}
                      />
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityLabel="Deposit USDC"
                    accessibilityRole="button"
                    disabled={isDepositing}
                    onPress={() => {
                      void handleDeposit();
                    }}
                    style={({ pressed }) => [
                      styles.depositButton,
                      isDepositing && styles.buttonDisabled,
                      pressed && !isDepositing && styles.buttonPressed,
                    ]}
                  >
                    {isDepositing ? (
                      <ActivityIndicator color={colors.onBrand} />
                    ) : (
                      <Text style={styles.depositButtonText}>Deposit</Text>
                    )}
                  </Pressable>
                </View>
                {isLoading ? (
                  <View
                    accessibilityLabel="Loading balance"
                    style={styles.loadingRow}
                  >
                    <ActivityIndicator />
                    <Text style={styles.loadingText}>Loading balance</Text>
                  </View>
                ) : (
                  <Text
                    accessibilityLabel={
                      owner
                        ? `Balance ${formatUsd(totalUsd)}, ${formatUsd(usdcAmount)} USDC`
                        : `Balance ${formatUsd(totalUsd)}`
                    }
                    style={styles.balanceValue}
                  >
                    {formatUsd(totalUsd)}
                  </Text>
                )}
              </View>
              <Pressable
                accessibilityLabel={`${USDC_ON_BASE.symbol} ${formatUsd(usdcAmount)}`}
                accessibilityRole="button"
                onPress={() => {
                  navigation.getParent()?.navigate('trade', {
                    fromSymbol: 'USDC',
                  });
                }}
                style={({ pressed }) => [
                  styles.usdcSection,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.usdcIdentity}>
                  {usdcLogoFailed ? (
                    <View style={styles.usdcLogoFallback}>
                      <Text style={styles.usdcLogoFallbackText}>
                        {USDC_ON_BASE.symbol.slice(0, 1)}
                      </Text>
                    </View>
                  ) : (
                    <Image
                      accessibilityIgnoresInvertColors
                      onError={() => {
                        setUsdcLogoFailed(true);
                      }}
                      source={{ uri: USDC_ON_BASE.logoUri }}
                      style={styles.usdcLogo}
                    />
                  )}
                  <Text style={styles.usdcTicker}>{USDC_ON_BASE.symbol}</Text>
                </View>
                <Text style={styles.usdcValue}>{formatUsd(usdcAmount)}</Text>
              </Pressable>
            </View>

            {owner && !isLoading ? (
              <BalanceChart points={balanceHistory} />
            ) : null}

            {depositError ? (
              <Text style={styles.error}>{depositError}</Text>
            ) : null}

            {errorMessage ? (
              <Text style={styles.error}>{errorMessage}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.tabPanel}>
            {portfolioCaption ? (
              <Text style={styles.caption}>{portfolioCaption}</Text>
            ) : null}
            {owner && positions.length > 0 ? (
              <View style={styles.list}>
                {positions.map((holding) => (
                  <StockRow
                    key={holding.quote.symbol}
                    detail={`${formatShares(holding.amount)} shares`}
                    onBuy={() => {
                      navigation.getParent()?.navigate('trade', {
                        toSymbol: holding.quote.symbol,
                      });
                    }}
                    onPress={() => {
                      navigation.getParent()?.navigate('trade', {
                        fromSymbol: holding.quote.symbol,
                        toSymbol: 'USDC',
                      });
                    }}
                    onSell={() => {
                      navigation.getParent()?.navigate('trade', {
                        fromSymbol: holding.quote.symbol,
                        toSymbol: 'USDC',
                      });
                    }}
                    quote={holding.quote}
                    valueLabel={
                      holding.valueUsd == null
                        ? '—'
                        : formatUsd(holding.valueUsd)
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setInfoVisible(false);
        }}
        transparent
        visible={infoVisible}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close balance info"
            accessibilityRole="button"
            onPress={() => {
              setInfoVisible(false);
            }}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={styles.modalCard}>
            <Text style={styles.modalTitle}>Balance</Text>
            <Text style={styles.modalBody}>
              USDC and Coinbase B20 tokens in your wallet.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setInfoVisible(false);
              }}
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
    tabs: {
      marginTop: 20,
    },
    tabPanel: {
      marginTop: 16,
    },
    balanceCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    balanceTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    balanceLabel: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    pressed: {
      opacity: 0.7,
    },
    balanceValue: {
      marginTop: 8,
      fontSize: 36,
      fontWeight: '700',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    usdcSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    usdcIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    usdcLogo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
    },
    usdcLogoFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
    },
    usdcLogoFallbackText: {
      color: colors.onBrand,
      fontSize: 16,
      fontWeight: '700',
    },
    usdcTicker: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    usdcValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    depositButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 88,
      minHeight: 32,
      backgroundColor: colors.brand,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    depositButtonText: {
      color: colors.onBrand,
      fontSize: 13,
      fontWeight: '600',
    },
    caption: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
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
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    modalBody: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    modalButton: {
      marginTop: 20,
      alignSelf: 'flex-start',
      minWidth: 100,
      alignItems: 'center',
      backgroundColor: colors.brand,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    modalButtonText: {
      color: colors.onBrand,
      fontSize: 16,
      fontWeight: '600',
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
      gap: 10,
    },
  });
}

function isOnrampClosedError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /exited flow|cancel|closed|dismiss|abort/i.test(text);
}
