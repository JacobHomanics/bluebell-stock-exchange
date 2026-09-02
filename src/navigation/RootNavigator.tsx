import {
  CommonActions,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo } from 'react';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/hooks/useAuth';
import { useWebNavigationA11yFix } from '@/hooks/useWebNavigationA11yFix';
import { rootLinking } from '@/navigation/linking';
import { RootStack } from '@/navigation/RootStack';
import type { RootStackParamList } from '@/navigation/types';

export function RootNavigator() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { isReady, isAuthenticated } = useAuth();
  const { colors, isDark } = useAppTheme();
  useWebNavigationA11yFix(navigationRef);

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.brandAccent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.error,
      },
    };
  }, [colors, isDark]);

  const enforceAuthRoutes = useCallback(() => {
    if (!navigationRef.isReady() || !isReady) {
      return;
    }

    const rootState = navigationRef.getRootState();
    if (!rootState?.routes?.length) {
      return;
    }

    const activeRootRoute =
      rootState.routes[rootState.index ?? rootState.routes.length - 1];

    if (!activeRootRoute) {
      return;
    }

    if (
      isAuthenticated &&
      (activeRootRoute.name === 'login' ||
        activeRootRoute.name === 'loginVerify')
    ) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'main', params: { screen: 'home' } }],
        }),
      );
    }
  }, [isAuthenticated, isReady, navigationRef]);

  useEffect(() => {
    enforceAuthRoutes();
  }, [enforceAuthRoutes]);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={rootLinking}
      theme={navigationTheme}
      onReady={enforceAuthRoutes}
      onStateChange={enforceAuthRoutes}
    >
      <RootStack />
      <StatusBar style={colors.statusBarStyle} />
    </NavigationContainer>
  );
}
