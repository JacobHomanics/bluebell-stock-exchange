import { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useCallback } from 'react';

import { useEnsureEmbeddedWalletEffect } from '@/hooks/useEnsureEmbeddedWallet.shared';
import { useEnsureWalletSigners } from '@/hooks/useEnsureWalletSigners';
import { useEnsureWalletSignerEffect } from '@/hooks/useEnsureWalletSigners.shared';

export function useEnsureEmbeddedWallet() {
  const { create, wallets } = useEmbeddedEthereumWallet();
  const { ensureWalletSigners } = useEnsureWalletSigners();
  const createWallet = useCallback(() => create(), [create]);
  useEnsureEmbeddedWalletEffect(createWallet);
  useEnsureWalletSignerEffect(wallets[0]?.address, ensureWalletSigners);
}
