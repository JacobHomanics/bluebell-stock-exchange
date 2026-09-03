import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export type SegmentedTab<T extends string> = {
  id: T;
  label: string;
};

type SegmentedTabsProps<T extends string> = {
  tabs: readonly SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  accessibilityLabel?: string;
};

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedTabsProps<T>) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      style={styles.group}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.id}
            onPress={() => {
              onChange(tab.id);
            }}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    group: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 4,
      gap: 4,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 10,
    },
    tabSelected: {
      backgroundColor: colors.brand,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
    },
    labelSelected: {
      color: colors.onBrand,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}
