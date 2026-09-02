import { useCallback, useEffect, useState } from 'react';

import { useSendLoginCode } from '@/hooks/useSendLoginCode';
import type { LoginMethod } from '@/lib/privy/context/AuthFlowContext.shared';

const DEFAULT_COOLDOWN_SECONDS = 10;

/** Resend a login email/SMS code with a short cooldown. */
export function useResendLoginCode(cooldownSeconds = DEFAULT_COOLDOWN_SECONDS) {
  const { send } = useSendLoginCode();
  const [cooldown, setCooldown] = useState(cooldownSeconds);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const id = setTimeout(() => {
      setCooldown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = useCallback(
    async (method: LoginMethod, value: string) => {
      if (cooldown > 0 || isPending) {
        return;
      }

      setIsPending(true);
      try {
        await send(method, value);
        setCooldown(cooldownSeconds);
      } finally {
        setIsPending(false);
      }
    },
    [cooldown, cooldownSeconds, isPending, send],
  );

  return {
    resend,
    cooldown,
    isPending,
    canResend: cooldown === 0 && !isPending,
  };
}
