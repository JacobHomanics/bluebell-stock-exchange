import type { ComponentType } from 'react';

import { MainTabs } from '@/navigation/MainTabs';
import {
  ROOT_STACK_INITIAL_ROUTE,
  type RootStackParamList,
} from '@/navigation/types';
import { LoginScreen } from '@/screens/LoginScreen';
import { LoginVerifyScreen } from '@/screens/LoginVerifyScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import { TradeScreen } from '@/screens/TradeScreen';

export { ROOT_STACK_INITIAL_ROUTE };

export const rootStackScreens = {
  splash: SplashScreen,
  login: LoginScreen,
  loginVerify: LoginVerifyScreen,
  main: MainTabs,
  trade: TradeScreen,
} as const satisfies Record<keyof RootStackParamList, ComponentType<object>>;
