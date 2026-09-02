import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { CodeDigitInputs } from '@/components/CodeDigitInputs';
import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';
import { useResendLoginCode } from '@/hooks/useResendLoginCode';
import { useVerifyLoginCode } from '@/hooks/useVerifyLoginCode';
import type { RootStackParamList } from '@/navigation/types';

export function LoginVerifyScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isDesktopWeb = useIsDesktopWeb();
  const route = useRoute<RouteProp<RootStackParamList, 'loginVerify'>>();
  const { verify } = useVerifyLoginCode();
  const { resend, cooldown, canResend, isPending: isResendPending } =
    useResendLoginCode();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeInputResetSignal, setCodeInputResetSignal] = useState(0);

  const { method, value } = route.params;

  const handleVerify = useCallback(
    async (code: string) => {
      if (isPending) {
        return;
      }

      setErrorMessage(null);
      setIsPending(true);
      Keyboard.dismiss();

      try {
        await verify(method, value, code);
        navigation.reset({
          index: 0,
          routes: [{ name: 'main', params: { screen: 'home' } }],
        });
      } catch (error) {
        console.error(error);
        setCodeInputResetSignal((current) => current + 1);
        setErrorMessage('Invalid code. Please try again.');
      } finally {
        setIsPending(false);
      }
    },
    [isPending, method, navigation, value, verify],
  );

  const handleResend = async () => {
    if (!canResend) {
      return;
    }

    setErrorMessage(null);

    try {
      await resend(method, value);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        method === 'email'
          ? 'Could not resend an email code. Please try again.'
          : 'Could not resend an SMS code. Please try again.',
      );
    }
  };

  return (
    <View style={styles.container}>
      {!isDesktopWeb ? (
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <BackButton accessibilityLabel="Back to login" />
        </View>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.title}>Enter code</Text>
        <Text style={styles.subtitle}>We sent a code to {value}.</Text>

        <CodeDigitInputs
          key={codeInputResetSignal}
          editable={!isPending}
          focusOnMount
          onCodeComplete={(code) => {
            void handleVerify(code);
          }}
        />

        {isPending ? (
          <ActivityIndicator color={colors.brandAccent} style={styles.spinner} />
        ) : null}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canResend || isPending}
          onPress={() => {
            void handleResend();
          }}
          style={({ pressed }) => [
            styles.resendButton,
            pressed && canResend && !isPending && styles.resendButtonPressed,
          ]}
        >
          {isResendPending ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <Text
              style={[
                styles.resendText,
                (cooldown > 0 || isPending) && styles.resendTextDisabled,
              ]}
            >
              {cooldown > 0
                ? `Resend verification code in ${cooldown} seconds...`
                : 'Resend code'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 8,
      alignItems: 'flex-start',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingBottom: 48,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      marginTop: 12,
      marginBottom: 24,
      fontSize: 16,
      lineHeight: 24,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    spinner: {
      marginTop: 20,
    },
    error: {
      marginTop: 16,
      fontSize: 14,
      color: colors.error,
      textAlign: 'center',
    },
    resendButton: {
      marginTop: 24,
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resendButtonPressed: {
      opacity: 0.8,
    },
    resendText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.brandAccent,
      textAlign: 'center',
    },
    resendTextDisabled: {
      color: colors.textMuted,
      opacity: 0.7,
    },
  });
}
