import type { NavigatorScreenParams } from '@react-navigation/native';

import type { LoginMethod } from '@/lib/privy/context/AuthFlowContext.shared';
import type { SwapQuoteSnapshot } from '@/lib/stocks/lifi';

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
  tradeConfirm: {
    fromSymbol: string;
    toSymbol: string;
    amount: string;
    inputUnit: 'usd' | 'token';
    quote: SwapQuoteSnapshot | null;
  };
};

export const ROOT_STACK_INITIAL_ROUTE: keyof RootStackParamList = 'splash';
