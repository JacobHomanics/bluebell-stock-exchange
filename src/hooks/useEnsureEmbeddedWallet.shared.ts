import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getEthereumAddress } from '@/lib/privy/getEthereumAddress';

let ensurePromise: Promise<void> | null = null;

function userIdOf(user: unknown): string | null {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const id = (user as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function isEmbeddedWalletAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : 'error' in error && typeof error.error === 'string'
        ? error.error
        : '';

  return /already exists/i.test(message);
}

function runExclusiveEnsure(task: () => Promise<void>): Promise<void> {
  if (ensurePromise) {
    return ensurePromise;
  }

  ensurePromise = (async () => {
    try {
      await task();
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

/**
 * Custom OTP login does not honor dashboard / createOnLogin auto-create.
 * Create an Ethereum embedded wallet once the user is authenticated.
 * @see https://docs.privy.io/basics/react/advanced/automatic-wallet-creation
 */
export function useEnsureEmbeddedWalletEffect(
  createWallet: () => Promise<unknown>,
) {
  const { isReady, isAuthenticated, user } = useAuth();
  const attemptedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user) {
      attemptedForUserRef.current = null;
      return;
    }

    if (getEthereumAddress(user)) {
      return;
    }

    const userId = userIdOf(user);
    if (!userId || attemptedForUserRef.current === userId) {
      return;
    }
    attemptedForUserRef.current = userId;

    void runExclusiveEnsure(async () => {
      try {
        await createWallet();
      } catch (error) {
        if (!isEmbeddedWalletAlreadyExistsError(error)) {
          attemptedForUserRef.current = null;
          throw error;
        }
      }
    }).catch((error) => {
      console.error('Failed to create embedded wallet', error);
    });
  }, [createWallet, isAuthenticated, isReady, user]);
}
