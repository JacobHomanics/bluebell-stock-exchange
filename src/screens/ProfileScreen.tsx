import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { getEthereumAddress } from '@/lib/privy/getEthereumAddress';

function accountLabel(user: unknown): string {
  if (!user || typeof user !== 'object') {
    return 'Signed in';
  }

  const record = user as {
    email?: { address?: string } | string;
    phone?: { number?: string } | string;
    linkedAccounts?: {
      type?: string;
      address?: string;
      number?: string;
    }[];
  };

  if (typeof record.email === 'string' && record.email) {
    return record.email;
  }
  if (record.email && typeof record.email === 'object' && record.email.address) {
    return record.email.address;
  }
  if (typeof record.phone === 'string' && record.phone) {
    return record.phone;
  }
  if (record.phone && typeof record.phone === 'object' && record.phone.number) {
    return record.phone.number;
  }

  const emailAccount = record.linkedAccounts?.find(
    (account) => account.type === 'email',
  );
  if (emailAccount?.address) {
    return emailAccount.address;
  }

  const phoneAccount = record.linkedAccounts?.find(
    (account) => account.type === 'phone',
  );
  if (phoneAccount?.number) {
    return phoneAccount.number;
  }
  if (phoneAccount?.address) {
    return phoneAccount.address;
  }

  return 'Signed in';
}

export function ProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletAddress = useMemo(() => getEthereumAddress(user), [user]);

  useEffect(() => {
    setCopied(false);
  }, [walletAddress]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [copied]);

  const handleSignOut = async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);
    try {
      await logout();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <Text style={styles.kicker}>Account</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.body}>{accountLabel(user)}</Text>

        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletLabel}>Ethereum wallet</Text>
            {walletAddress ? (
              <Pressable
                accessibilityLabel="Copy wallet address"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  void Clipboard.setStringAsync(walletAddress).then(
                    (didCopy) => {
                      if (didCopy) {
                        setCopied(true);
                      }
                    },
                  );
                }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.copy}>{copied ? 'Copied' : 'Copy'}</Text>
              </Pressable>
            ) : null}
          </View>
          {walletAddress ? (
            <>
              <Text selectable style={styles.walletAddress}>
                {walletAddress}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  void Linking.openURL(
                    `https://basescan.org/address/${walletAddress}`,
                  );
                }}
              >
                <Text style={styles.link}>View on Basescan</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.walletEmpty}>
              No wallet is linked to this account yet.
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={() => {
            void handleSignOut();
          }}
          style={({ pressed }) => [
            styles.button,
            isPending && styles.buttonDisabled,
            pressed && !isPending && styles.buttonPressed,
          ]}
        >
          {isPending ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.buttonText}>Sign out</Text>
          )}
        </Pressable>
      </View>
    </View>
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
    walletCard: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    walletHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    walletLabel: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    copy: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.brandAccent,
    },
    pressed: {
      opacity: 0.7,
    },
    walletAddress: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    walletEmpty: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    link: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '600',
      color: colors.brandAccent,
    },
    button: {
      marginTop: 32,
      alignSelf: 'flex-start',
      minWidth: 140,
      alignItems: 'center',
      backgroundColor: colors.brand,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonText: {
      color: colors.onBrand,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
