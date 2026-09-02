import { StyleSheet, View } from 'react-native';

import { BrandLockup } from '@/components/BrandLockup';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSplashRedirect } from '@/hooks/useSplashRedirect';

export function SplashScreen() {
  useSplashRedirect();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.brand }]}>
      <BrandLockup layout="stack" showTagline size="lg" tone="onBrand" />
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
});
