import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';
import type { RootStackParamList } from '@/navigation/types';

type BackButtonProps = {
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export function BackButton({
  onPress,
  accessibilityLabel = 'Go back',
  disabled = false,
}: BackButtonProps) {
  const { colors } = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDesktopWeb = useIsDesktopWeb();

  if (isDesktopWeb) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={12}
      onPress={() => {
        if (onPress) {
          onPress();
          return;
        }
        navigation.goBack();
      }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name="chevron-back" size={28} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
