import { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useCallback } from 'react';

import { useEnsureEmbeddedWalletEffect } from '@/hooks/useEnsureEmbeddedWallet.shared';

export function useEnsureEmbeddedWallet() {
  const { create } = useEmbeddedEthereumWallet();
  const createWallet = useCallback(() => create(), [create]);
  useEnsureEmbeddedWalletEffect(createWallet);
}
