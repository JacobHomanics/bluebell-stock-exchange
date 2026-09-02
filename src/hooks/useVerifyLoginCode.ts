import type { LoginMethod } from '@/lib/privy/context/AuthFlowContext.shared';
import { useAuthFlow } from '@/lib/privy/context/AuthFlowContext';
import { normalizePhoneNumber } from '@/hooks/useSendLoginCode';

export function useVerifyLoginCode() {
  const { loginWithEmailCode, loginWithSMSCode } = useAuthFlow();

  return {
    verify: async (method: LoginMethod, value: string, code: string) => {
      const trimmedCode = code.trim();

      if (method === 'email') {
        await loginWithEmailCode({
          code: trimmedCode,
          email: value.trim(),
        });
        return;
      }

      await loginWithSMSCode({
        code: trimmedCode,
        phone: normalizePhoneNumber(value),
      });
    },
  };
}
