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
import { formatShares } from '@/lib/stocks/fetchBalances';
import { formatUsd } from '@/lib/stocks/fetchQuotes';
import type { RootStackParamList } from '@/navigation/types';

const HOME_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'portfolio', label: 'Portfolio' },
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
  const [infoVisible, setInfoVisible] = useState(false);
  const [usdcLogoFailed, setUsdcLogoFailed] = useState(false);
  const [homeTab, setHomeTab] = useState<HomeTabId>('overview');

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
              <View
                accessibilityLabel={
                  owner
                    ? `Balance ${formatUsd(totalUsd)}, ${formatUsd(usdcAmount)} USDC`
                    : `Balance ${formatUsd(totalUsd)}`
                }
              >
                <View style={styles.balanceHeader}>
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
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator />
                    <Text style={styles.loadingText}>Loading balance</Text>
                  </View>
                ) : (
                  <Text style={styles.balanceValue}>{formatUsd(totalUsd)}</Text>
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
                    onPress={() => {
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
      gap: 6,
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
    buttonPressed: {
      opacity: 0.85,
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
