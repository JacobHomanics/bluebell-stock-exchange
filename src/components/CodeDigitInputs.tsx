import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  CODE_DIGIT_COUNT,
  useCodeDigitInput,
} from '@/hooks/useCodeDigitInput';

type CodeDigitInputsProps = {
  editable?: boolean;
  focusOnMount?: boolean;
  onCodeComplete?: (code: string) => void;
};

/** Six individual digit boxes for login verification codes. */
export function CodeDigitInputs({
  editable = true,
  focusOnMount = false,
  onCodeComplete,
}: CodeDigitInputsProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { codeDigits, codeInputRefs, handleDigitChange, handleKeyPress } =
    useCodeDigitInput({
      focusOnMount,
      onCodeComplete,
    });
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  return (
    <View style={styles.codeRow}>
      {Array.from({ length: CODE_DIGIT_COUNT }, (_, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            codeInputRefs.current[index] = ref;
          }}
          accessibilityLabel={`Digit ${index + 1} of ${CODE_DIGIT_COUNT}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoCorrect={false}
          editable={editable}
          inputMode="numeric"
          keyboardType="number-pad"
          onBlur={() => {
            setFocusedIndex((current) => (current === index ? null : current));
          }}
          onChangeText={(value) => handleDigitChange(index, value)}
          onFocus={() => {
            setFocusedIndex(index);
          }}
          onKeyPress={({ nativeEvent }) =>
            handleKeyPress(index, nativeEvent.key)
          }
          selectTextOnFocus
          style={[
            styles.codeInput,
            focusedIndex === index && styles.codeInputFocused,
            !editable && styles.codeInputDisabled,
          ]}
          textContentType="oneTimeCode"
          value={codeDigits[index] ?? ''}
        />
      ))}
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    codeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      width: '100%',
      maxWidth: 360,
      gap: 8,
    },
    codeInput: {
      flexGrow: 1,
      flexBasis: 0,
      maxWidth: 48,
      height: 48,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 24,
      fontWeight: '600',
      textAlign: 'center',
    },
    codeInputFocused: {
      borderColor: colors.brandAccent,
    },
    codeInputDisabled: {
      opacity: 0.55,
    },
  });
}
