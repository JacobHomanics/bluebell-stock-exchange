import { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppThemeColors } from '@/constants/theme';
import type { TradeAsset } from '@/constants/tradeAssets';
import { useAppTheme } from '@/hooks/useAppTheme';

type TokenPickerProps = {
  visible: boolean;
  assets: readonly TradeAsset[];
  selectedId: string;
  title: string;
  onSelect: (asset: TradeAsset) => void;
  onClose: () => void;
};

export function TokenPicker({
  visible,
  assets,
  selectedId,
  title,
  onSelect,
  onClose,
}: TokenPickerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close token picker"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.list}
          >
            {assets.map((asset) => {
              const selected = asset.id === selectedId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={asset.id}
                  onPress={() => {
                    onSelect(asset);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    selected && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <AssetLogo uri={asset.logoUri} symbol={asset.symbol} />
                  <View style={styles.meta}>
                    <Text style={styles.symbol}>{asset.symbol}</Text>
                    <Text numberOfLines={1} style={styles.name}>
                      {asset.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AssetLogo({ uri, symbol }: { uri: string; symbol: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={styles.logoFallback}>
        <Text style={styles.logoFallbackText}>{symbol.slice(0, 1)}</Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      onError={() => {
        setFailed(true);
      }}
      source={{ uri }}
      style={styles.logo}
    />
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheet: {
      maxHeight: '72%',
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    list: {
      flexGrow: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    rowSelected: {
      backgroundColor: colors.surface,
    },
    rowPressed: {
      opacity: 0.75,
    },
    logo: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    logoFallback: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
    },
    logoFallbackText: {
      color: colors.onBrand,
      fontSize: 15,
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
  });
}
