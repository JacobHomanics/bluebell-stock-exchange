import { useLoginWithSms, useLoginWithEmail } from '@privy-io/react-auth';

import { createAuthFlowContext } from '@/lib/privy/context/AuthFlowContext.shared';

export const { AuthFlowProvider, useAuthFlow } = createAuthFlowContext({
  useLoginWithSms,
  useLoginWithEmail,
  mapPhoneToSmsSend: (sms) => (phone) =>
    sms.sendCode({ phoneNumber: phone }),
  mapEmailToEmailSend: (email) => (address) =>
    email.sendCode({ email: address }),
  // Web Privy only needs the OTP code; destination was bound in sendCode.
  mapSmsLogin: (sms) => ({ code }) => sms.loginWithCode({ code }),
  mapEmailLogin: (email) => ({ code }) => email.loginWithCode({ code }),
});
