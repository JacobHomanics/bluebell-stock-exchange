import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';
import {
  ROOT_STACK_INITIAL_ROUTE,
  rootStackScreens,
} from '@/navigation/RootStack.shared';
import type { RootStackParamList } from '@/navigation/types';

const WebStack = createStackNavigator<RootStackParamList>();

export function RootStack() {
  const isDesktopWeb = useIsDesktopWeb();
  const { colors } = useAppTheme();

  return (
    <WebStack.Navigator
      initialRouteName={ROOT_STACK_INITIAL_ROUTE}
      screenOptions={{
        headerShown: false,
        animation: isDesktopWeb ? 'none' : 'slide_from_right',
        cardStyle:
          Platform.OS === 'web'
            ? { flex: 1, backgroundColor: colors.background }
            : { backgroundColor: colors.background },
      }}
    >
      <WebStack.Screen name="splash" component={rootStackScreens.splash} />
      <WebStack.Screen name="login" component={rootStackScreens.login} />
      <WebStack.Screen
        name="loginVerify"
        component={rootStackScreens.loginVerify}
      />
      <WebStack.Screen name="main" component={rootStackScreens.main} />
      <WebStack.Screen name="trade" component={rootStackScreens.trade} />
    </WebStack.Navigator>
  );
}
