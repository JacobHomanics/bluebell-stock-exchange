import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatUsd, type StockQuote } from '@/lib/stocks/fetchQuotes';

type StockRowProps = {
  quote: StockQuote;
  detail?: string;
  valueLabel?: string;
  onPress?: () => void;
  onBuy: () => void;
  onSell: () => void;
};

export function StockRow({
  quote,
  detail,
  valueLabel,
  onPress,
  onBuy,
  onSell,
}: StockRowProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [logoFailed, setLogoFailed] = useState(false);

  const trailingLabel =
    valueLabel ?? (quote.priceUsd == null ? '—' : formatUsd(quote.priceUsd));
  const subtitle = detail ?? quote.name;
  const accessibilityLabel = `${quote.symbol}, ${subtitle}, ${trailingLabel}`;

  const identity = (
    <>
      {logoFailed ? (
        <View style={styles.logoFallback}>
          <Text style={styles.logoFallbackText}>{quote.symbol.slice(0, 1)}</Text>
        </View>
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          onError={() => {
            setLogoFailed(true);
          }}
          source={{ uri: quote.logoUri }}
          style={styles.logo}
        />
      )}

      <View style={styles.meta}>
        <Text style={styles.symbol}>{quote.symbol}</Text>
        <Text numberOfLines={1} style={styles.name}>
          {subtitle}
        </Text>
      </View>

      <Text style={styles.price}>{trailingLabel}</Text>
    </>
  );

  return (
    <View style={styles.row}>
      {onPress ? (
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        >
          {identity}
        </Pressable>
      ) : (
        <View accessibilityLabel={accessibilityLabel} style={styles.main}>
          {identity}
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Buy ${quote.symbol}`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={onBuy}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons color={colors.brand} name="add-circle" size={26} />
        </Pressable>
        <Pressable
          accessibilityLabel={`Sell ${quote.symbol}`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={onSell}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons color={colors.error} name="remove-circle" size={26} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    main: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
    },
    logoFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
    },
    logoFallbackText: {
      color: colors.onBrand,
      fontSize: 16,
      fontWeight: '700',
    },
    meta: {
      flex: 1,
      minWidth: 0,
    },
    symbol: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    name: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    price: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    action: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
