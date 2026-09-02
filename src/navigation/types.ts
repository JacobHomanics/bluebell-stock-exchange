import type { NavigatorScreenParams } from '@react-navigation/native';

import type { LoginMethod } from '@/lib/privy/context/AuthFlowContext.shared';

export type MainTabParamList = {
  home: undefined;
  explore: undefined;
  profile: undefined;
};

export type RootStackParamList = {
  splash: undefined;
  login: undefined;
  loginVerify: {
    method: LoginMethod;
    value: string;
  };
  main: NavigatorScreenParams<MainTabParamList> | undefined;
  trade: {
    fromSymbol?: string;
    toSymbol?: string;
  };
};

export const ROOT_STACK_INITIAL_ROUTE: keyof RootStackParamList = 'splash';
