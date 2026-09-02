import type { LoginMethod } from '@/lib/privy/context/AuthFlowContext.shared';
import { useAuthFlow } from '@/lib/privy/context/AuthFlowContext';

export function useSendLoginCode() {
  const { sendEmailCode, sendSMSCode } = useAuthFlow();

  return {
    send: async (method: LoginMethod, value: string) => {
      if (method === 'email') {
        await sendEmailCode(value.trim());
        return;
      }

      await sendSMSCode(normalizePhoneNumber(value));
    },
  };
}

export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    return trimmed.replace(/[^\d+]/g, '');
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}
