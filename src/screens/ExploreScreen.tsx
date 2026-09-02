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
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTokenizedStockQuotes } from '@/hooks/useTokenizedStockQuotes';
import type { RootStackParamList } from '@/navigation/types';

export function ExploreScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { quotes, errorMessage, isLoading, isRefreshing, refresh } =
    useTokenizedStockQuotes();

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
      <Text style={styles.kicker}>Browse</Text>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.body}>
        Coinbase B20 tokens on Base. Tap a name to swap, including stock to
        stock via USDC.
      </Text>
      {errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading prices</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {quotes.map((quote) => (
          <StockRow
            key={quote.symbol}
            onPress={() => {
              navigation.getParent()?.navigate('trade', {
                toSymbol: quote.symbol,
              });
            }}
            quote={quote}
          />
        ))}
      </View>
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
    body: {
      fontSize: 16,
      lineHeight: 24,
      marginTop: 12,
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
