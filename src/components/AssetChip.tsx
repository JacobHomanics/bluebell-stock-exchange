import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppThemeColors } from '@/constants/theme';
import type { TradeAsset } from '@/constants/tradeAssets';
import { useAppTheme } from '@/hooks/useAppTheme';

type AssetChipProps = {
  asset: TradeAsset;
  onPress?: () => void;
};

export function AssetChip({ asset, onPress }: AssetChipProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [logoFailed, setLogoFailed] = useState(false);

  const content = (
    <>
      {logoFailed ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>{asset.symbol.slice(0, 1)}</Text>
        </View>
      ) : (
        <Image
          accessibilityIgnoresInvertColors
          onError={() => {
            setLogoFailed(true);
          }}
          source={{ uri: asset.logoUri }}
          style={styles.logo}
        />
      )}
      <Text style={styles.symbol}>{asset.symbol}</Text>
      {onPress ? (
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.chip}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`Select ${asset.symbol}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
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
    pressed: {
      opacity: 0.7,
    },
    logo: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    fallback: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
    },
    fallbackText: {
      color: colors.onBrand,
      fontSize: 12,
      fontWeight: '700',
    },
    symbol: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
