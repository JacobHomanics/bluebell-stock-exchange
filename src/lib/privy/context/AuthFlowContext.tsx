import { useLoginWithSMS, useLoginWithEmail } from '@privy-io/expo';

import { createAuthFlowContext } from '@/lib/privy/context/AuthFlowContext.shared';

export const { AuthFlowProvider, useAuthFlow } = createAuthFlowContext({
  useLoginWithSms: useLoginWithSMS,
  useLoginWithEmail,
  mapPhoneToSmsSend: (sms) => (phone) => sms.sendCode({ phone }),
  mapEmailToEmailSend: (email) => (address) =>
    email.sendCode({ email: address }),
  mapSmsLogin: (sms) => ({ code, phone }) =>
    sms.loginWithCode({ code, phone }),
  mapEmailLogin: (email) => ({ code, email: address }) =>
    email.loginWithCode({ code, email: address }),
});
