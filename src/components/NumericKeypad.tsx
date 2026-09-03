import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AmountKeypadKey } from '@/lib/stocks/parseAmount';

const KEYS: AmountKeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

type NumericKeypadProps = {
  disabled?: boolean;
  captureHardwareKeys?: boolean;
  onKey: (key: AmountKeypadKey) => void;
  onClear?: () => void;
};

function keyFromKeyboardEvent(key: string): AmountKeypadKey | null {
  if (key === 'Backspace') {
    return 'backspace';
  }
  if (key === '.' || key === ',') {
    return '.';
  }
  if (key >= '0' && key <= '9') {
    return key as AmountKeypadKey;
  }
  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (target == null || typeof target !== 'object') {
    return false;
  }

  const element = target as {
    tagName?: string;
    isContentEditable?: boolean;
  };
  const tag = element.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || element.isContentEditable === true;
}

export function NumericKeypad({
  disabled = false,
  captureHardwareKeys = true,
  onKey,
  onClear,
}: NumericKeypadProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (
      disabled ||
      !captureHardwareKeys ||
      Platform.OS !== 'web' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const handleKeyDown = (event: Event) => {
      const nativeEvent = event as unknown as {
        key: string;
        metaKey: boolean;
        ctrlKey: boolean;
        altKey: boolean;
        target: EventTarget | null;
        preventDefault: () => void;
      };
      if (nativeEvent.metaKey || nativeEvent.ctrlKey || nativeEvent.altKey) {
        return;
      }
      if (isEditableTarget(nativeEvent.target)) {
        return;
      }

      const mapped = keyFromKeyboardEvent(nativeEvent.key);
      if (mapped == null) {
        return;
      }

      nativeEvent.preventDefault();
      onKey(mapped);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [captureHardwareKeys, disabled, onKey]);

  return (
    <View
      accessibilityLabel="Amount keypad"
      style={[styles.pad, disabled && styles.padDisabled]}
    >
      {KEYS.map((row, rowIndex) => (
        <View key={row.join('-')} style={styles.row}>
          {row.map((key) => (
            <Pressable
              accessibilityLabel={
                key === 'backspace'
                  ? 'Delete'
                  : key === '.'
                    ? 'Decimal point'
                    : key
              }
              accessibilityRole="button"
              disabled={disabled}
              key={`${rowIndex}-${key}`}
              onLongPress={
                key === 'backspace' && onClear
                  ? () => {
                      onClear();
                    }
                  : undefined
              }
              onPress={() => {
                onKey(key);
              }}
              style={({ pressed }) => [
                styles.key,
                pressed && !disabled && styles.keyPressed,
              ]}
            >
              {key === 'backspace' ? (
                <Ionicons
                  name="backspace-outline"
                  size={28}
                  color={colors.text}
                />
              ) : (
                <Text selectable={false} style={styles.keyLabel}>
                  {key}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    pad: {
      flex: 1,
      width: '100%',
      maxWidth: 360,
      alignSelf: 'center',
      justifyContent: 'center',
      minHeight: 0,
      gap: 2,
    },
    padDisabled: {
      opacity: 0.45,
    },
    row: {
      flex: 1,
      flexDirection: 'row',
      minHeight: 0,
      gap: 8,
    },
    key: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
    },
    keyPressed: {
      backgroundColor: colors.surface,
    },
    keyLabel: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
  });
}
