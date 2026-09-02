import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

type SmsLoginHook = {
  // Privy SDK arg shapes differ across platforms; keep loose at the boundary.
  sendCode: (...args: any[]) => any;
  loginWithCode: (...args: any[]) => any;
};

type EmailLoginHook = {
  sendCode: (...args: any[]) => any;
  loginWithCode: (...args: any[]) => any;
};

type AuthFlowConfig<
  TSmsHook extends SmsLoginHook,
  TEmailHook extends EmailLoginHook,
> = {
  useLoginWithSms: () => TSmsHook;
  useLoginWithEmail: () => TEmailHook;
  mapPhoneToSmsSend: (
    sms: TSmsHook,
  ) => (phone: string) => ReturnType<TSmsHook['sendCode']>;
  mapEmailToEmailSend: (
    email: TEmailHook,
  ) => (address: string) => ReturnType<TEmailHook['sendCode']>;
  mapSmsLogin: (
    sms: TSmsHook,
  ) => (input: { code: string; phone: string }) => ReturnType<
    TSmsHook['loginWithCode']
  >;
  mapEmailLogin: (
    email: TEmailHook,
  ) => (input: { code: string; email: string }) => ReturnType<
    TEmailHook['loginWithCode']
  >;
};

export type LoginMethod = 'email' | 'phone';

export function createAuthFlowContext<
  TSmsHook extends SmsLoginHook,
  TEmailHook extends EmailLoginHook,
>({
  useLoginWithSms,
  useLoginWithEmail,
  mapPhoneToSmsSend,
  mapEmailToEmailSend,
  mapSmsLogin,
  mapEmailLogin,
}: AuthFlowConfig<TSmsHook, TEmailHook>) {
  type AuthFlowContextValue = {
    sendSMSCode: ReturnType<typeof mapPhoneToSmsSend>;
    sendEmailCode: ReturnType<typeof mapEmailToEmailSend>;
    loginWithSMSCode: ReturnType<typeof mapSmsLogin>;
    loginWithEmailCode: ReturnType<typeof mapEmailLogin>;
  };

  const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

  function AuthFlowProvider({ children }: { children: ReactNode }) {
    const sms = useLoginWithSms();
    const email = useLoginWithEmail();

    const value = useMemo<AuthFlowContextValue>(
      () => ({
        sendSMSCode: mapPhoneToSmsSend(sms),
        sendEmailCode: mapEmailToEmailSend(email),
        loginWithSMSCode: mapSmsLogin(sms),
        loginWithEmailCode: mapEmailLogin(email),
      }),
      [sms, email],
    );

    return (
      <AuthFlowContext.Provider value={value}>{children}</AuthFlowContext.Provider>
    );
  }

  function useAuthFlow(): AuthFlowContextValue {
    const ctx = useContext(AuthFlowContext);
    if (!ctx) {
      throw new Error('useAuthFlow must be used within an AuthFlowProvider');
    }
    return ctx;
  }

  return { AuthFlowProvider, useAuthFlow };
}
