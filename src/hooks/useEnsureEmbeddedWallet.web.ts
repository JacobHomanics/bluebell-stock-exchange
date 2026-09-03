import { useCreateWallet } from '@privy-io/react-auth';
import { useCallback } from 'react';

import { useEnsureEmbeddedWalletEffect } from '@/hooks/useEnsureEmbeddedWallet.shared';

export function useEnsureEmbeddedWallet() {
  const { createWallet } = useCreateWallet();
  const create = useCallback(() => createWallet(), [createWallet]);
  useEnsureEmbeddedWalletEffect(create);
}
