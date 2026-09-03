import type { ComponentType } from 'react';

import { APP_NAME } from '@/constants/brand';
import { MainTabs } from '@/navigation/MainTabs';
import {
  ROOT_STACK_INITIAL_ROUTE,
  type RootStackParamList,
} from '@/navigation/types';
import { LoginScreen } from '@/screens/LoginScreen';
import { LoginVerifyScreen } from '@/screens/LoginVerifyScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import { TradeConfirmScreen } from '@/screens/TradeConfirmScreen';
import { TradeScreen } from '@/screens/TradeScreen';

export { ROOT_STACK_INITIAL_ROUTE };

export const rootStackScreenTitles = {
  splash: APP_NAME,
  login: 'Log in',
  loginVerify: 'Verify',
  main: APP_NAME,
  trade: 'Trade',
  tradeConfirm: 'Confirm',
} as const;

export const rootStackScreens = {
  splash: SplashScreen,
  login: LoginScreen,
  loginVerify: LoginVerifyScreen,
  main: MainTabs,
  trade: TradeScreen,
  tradeConfirm: TradeConfirmScreen,
} as const satisfies Record<keyof RootStackParamList, ComponentType<object>>;
