import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';

function userIdOf(user: unknown): string | null {
  if (!user || typeof user !== 'object' || !('id' in user)) {
    return null;
  }
  const id = (user as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function isWalletProxyNotReadyError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error ?? '');
  return /wallet proxy not initialized/i.test(message);
}

/**
 * After the embedded wallet exists, attach the app authorization key as a
 * signer so Convex can send sponsored transactions on the user's behalf.
 */
export function useEnsureWalletSignerEffect(
  address: string | null | undefined,
  ensureWalletSigners: (addresses: string[]) => Promise<void>,
) {
  const { isReady, isAuthenticated, user } = useAuth();
  const signerSucceededKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user || !address) {
      signerSucceededKeyRef.current = null;
      return;
    }

    const userId = userIdOf(user);
    if (!userId) {
      return;
    }

    const attemptKey = `${userId}:${address}`;
    if (signerSucceededKeyRef.current === attemptKey) {
      return;
    }

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    const maxAttempts = 8;

    const provision = () => {
      if (cancelled) {
        return;
      }
      attempt += 1;
      void ensureWalletSigners([address])
        .then(() => {
          if (!cancelled) {
            signerSucceededKeyRef.current = attemptKey;
          }
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          if (isWalletProxyNotReadyError(error) && attempt < maxAttempts) {
            retryTimeout = setTimeout(provision, 500 * attempt);
            return;
          }
          if (!isWalletProxyNotReadyError(error)) {
            console.error('Failed to ensure wallet signers', error);
          }
        });
    };

    provision();

    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [address, ensureWalletSigners, isAuthenticated, isReady, user]);
}
