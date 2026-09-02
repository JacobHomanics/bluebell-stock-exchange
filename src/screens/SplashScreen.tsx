import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useSplashRedirect } from '@/hooks/useSplashRedirect';

export function SplashScreen() {
  useSplashRedirect();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.brand }]}>
      <Text style={styles.title}>Base Stock Exchange</Text>
      <Text style={styles.subtitle}>Markets on Base</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});
