import { useCreateWallet, useWallets } from '@privy-io/react-auth';
import { useCallback } from 'react';

import { useEnsureEmbeddedWalletEffect } from '@/hooks/useEnsureEmbeddedWallet.shared';
import { useEnsureWalletSigners } from '@/hooks/useEnsureWalletSigners';
import { useEnsureWalletSignerEffect } from '@/hooks/useEnsureWalletSigners.shared';

export function useEnsureEmbeddedWallet() {
  const { createWallet } = useCreateWallet();
  const { wallets } = useWallets();
  const { ensureWalletSigners } = useEnsureWalletSigners();
  const create = useCallback(() => createWallet(), [createWallet]);
  const wallet =
    wallets.find((item) => item.walletClientType === 'privy') ?? wallets[0];
  useEnsureEmbeddedWalletEffect(create);
  useEnsureWalletSignerEffect(wallet?.address, ensureWalletSigners);
}
