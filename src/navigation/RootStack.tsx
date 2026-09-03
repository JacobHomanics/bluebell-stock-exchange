import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppTheme } from '@/hooks/useAppTheme';
import {
  ROOT_STACK_INITIAL_ROUTE,
  rootStackScreenTitles,
  rootStackScreens,
} from '@/navigation/RootStack.shared';
import type { RootStackParamList } from '@/navigation/types';

const NativeStack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  const { colors } = useAppTheme();

  return (
    <NativeStack.Navigator
      initialRouteName={ROOT_STACK_INITIAL_ROUTE}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <NativeStack.Screen
        name="splash"
        component={rootStackScreens.splash}
        options={{ title: rootStackScreenTitles.splash }}
      />
      <NativeStack.Screen
        name="login"
        component={rootStackScreens.login}
        options={{ title: rootStackScreenTitles.login }}
      />
      <NativeStack.Screen
        name="loginVerify"
        component={rootStackScreens.loginVerify}
        options={{ title: rootStackScreenTitles.loginVerify }}
      />
      <NativeStack.Screen
        name="main"
        component={rootStackScreens.main}
        options={{ title: rootStackScreenTitles.main }}
      />
      <NativeStack.Screen
        name="trade"
        component={rootStackScreens.trade}
        options={{ title: rootStackScreenTitles.trade }}
      />
      <NativeStack.Screen
        name="tradeConfirm"
        component={rootStackScreens.tradeConfirm}
        options={{ title: rootStackScreenTitles.tradeConfirm }}
      />
    </NativeStack.Navigator>
  );
}
