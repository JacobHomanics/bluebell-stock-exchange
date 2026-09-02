import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';

export const CODE_DIGIT_COUNT = 6;

const EMPTY_DIGITS = Array.from({ length: CODE_DIGIT_COUNT }, () => '');

type UseCodeDigitInputParams = {
  focusOnMount?: boolean;
  onCodeComplete?: (code: string) => void;
};

/** Six-digit OTP input: paste, auto-advance, backspace, and auto-submit. */
export function useCodeDigitInput(params?: UseCodeDigitInputParams) {
  const { focusOnMount = false, onCodeComplete } = params ?? {};

  const [codeDigits, setCodeDigits] = useState(EMPTY_DIGITS);
  const codeInputRefs = useRef<(TextInput | null)[]>([]);
  const lastCompletedCodeRef = useRef('');
  const onCodeCompleteRef = useRef(onCodeComplete);

  useEffect(() => {
    onCodeCompleteRef.current = onCodeComplete;
  }, [onCodeComplete]);

  const focusFirst = useCallback(() => {
    setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
  }, []);

  useEffect(() => {
    if (focusOnMount) {
      focusFirst();
    }
  }, [focusOnMount, focusFirst]);

  useEffect(() => {
    const nextCode = codeDigits.join('');
    if (
      nextCode.length !== CODE_DIGIT_COUNT ||
      nextCode === lastCompletedCodeRef.current
    ) {
      return;
    }

    lastCompletedCodeRef.current = nextCode;
    onCodeCompleteRef.current?.(nextCode);
  }, [codeDigits]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, CODE_DIGIT_COUNT);
      setCodeDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < digits.length && index + i < CODE_DIGIT_COUNT; i++) {
          next[index + i] = digits[i] ?? '';
        }
        return next;
      });

      setTimeout(() => {
        const nextEmpty = index + digits.length;
        if (nextEmpty < CODE_DIGIT_COUNT) {
          codeInputRefs.current[nextEmpty]?.focus();
        } else {
          codeInputRefs.current[CODE_DIGIT_COUNT - 1]?.blur();
        }
      }, 0);
      return;
    }

    const singleDigit = value.slice(-1).replace(/\D/g, '');
    setCodeDigits((prev) => {
      const next = [...prev];
      next[index] = singleDigit;
      return next;
    });

    if (singleDigit && index < CODE_DIGIT_COUNT - 1) {
      setTimeout(() => codeInputRefs.current[index + 1]?.focus(), 0);
    }
  }, []);

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !codeDigits[index] && index > 0) {
        codeInputRefs.current[index - 1]?.focus();
      }
    },
    [codeDigits],
  );

  return {
    codeDigits,
    code: codeDigits.join(''),
    codeInputRefs,
    handleDigitChange,
    handleKeyPress,
    focusFirst,
  };
}
