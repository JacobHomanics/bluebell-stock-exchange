import { useCallback, useEffect, useState } from 'react';
import type { Address } from 'viem';

import { readBalance } from '@/lib/stocks/erc20';

export function useTokenBalance(owner: Address | null, token: Address) {
  const [raw, setRaw] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!owner) {
      return;
    }

    setIsLoading(true);
    try {
      const next = await readBalance(token, owner);
      setRaw(next);
    } catch (error) {
      console.error(error);
      setRaw(0n);
    } finally {
      setIsLoading(false);
    }
  }, [owner, token]);

  useEffect(() => {
    if (!owner) {
      return;
    }

    let cancelled = false;
    void readBalance(token, owner)
      .then((next) => {
        if (!cancelled) {
          setRaw(next);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error(error);
        setRaw(0n);
      });

    return () => {
      cancelled = true;
    };
  }, [owner, token]);

  return {
    raw: owner ? raw : 0n,
    isLoading: Boolean(owner) && isLoading,
    refresh,
  };
}
