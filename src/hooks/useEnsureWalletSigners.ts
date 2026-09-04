import { useCallback } from 'react';
import { useSigners } from '@privy-io/expo';

import { getPrivySignerId } from '@/lib/privy/credentials/privySigner';

function isAlreadyProvisionedSignerError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error ?? '');
  const haystack = message.toLowerCase();
  return (
    (haystack.includes('already') && haystack.includes('signer')) ||
    haystack.includes('already exists') ||
    haystack.includes('duplicate')
  );
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
 * Adds the app authorization key as a signer on the user's embedded wallet.
 * Required for Convex / `@privy-io/node` to send on their behalf.
 */
export function useEnsureWalletSigners() {
  const { addSigners } = useSigners();

  const ensureWalletSigners = useCallback(
    async (addresses: string[]) => {
      const signerId = getPrivySignerId();
      if (!signerId) {
        console.warn(
          'Missing EXPO_PUBLIC_PRIVY_SIGNER_ID — server sends will fail until a signer is configured',
        );
        return;
      }

      for (const address of addresses) {
        const trimmed = address.trim();
        if (!trimmed) {
          continue;
        }
        try {
          await addSigners({
            address: trimmed,
            signers: [{ signerId, policyIds: [] }],
          });
        } catch (error) {
          if (isWalletProxyNotReadyError(error)) {
            throw error;
          }
          if (!isAlreadyProvisionedSignerError(error)) {
            throw error;
          }
        }
      }
    },
    [addSigners],
  );

  return { ensureWalletSigners };
}
