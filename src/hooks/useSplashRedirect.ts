import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { RootStackParamList } from '@/navigation/types';

const SPLASH_MIN_DURATION_MS = 800;

SplashScreen.preventAutoHideAsync().catch(() => {
  // Native splash may already be hidden (e.g. web / late call).
});

export function useSplashRedirect() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'splash'>>();
  const { isReady } = useAuth();
  const [hasMinDurationElapsed, setHasMinDurationElapsed] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setHasMinDurationElapsed(true);
    }, SPLASH_MIN_DURATION_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const canLeaveSplash = isReady && hasMinDurationElapsed;

  useEffect(() => {
    if (!canLeaveSplash) {
      return;
    }

    SplashScreen.hideAsync().catch(() => {
      // No-op if the splash screen is already hidden.
    });
  }, [canLeaveSplash]);

  useEffect(() => {
    if (!canLeaveSplash || route.name !== 'splash') {
      return;
    }

    navigation.replace('main', { screen: 'home' });
  }, [canLeaveSplash, navigation, route.name]);
}
