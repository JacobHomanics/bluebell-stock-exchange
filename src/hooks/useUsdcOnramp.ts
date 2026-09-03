import { useFundWallet } from '@privy-io/expo/ui';
import { useCallback } from 'react';
import { base } from 'viem/chains';

const DEFAULT_USDC_AMOUNT = '50';

export function useUsdcOnramp() {
  const { fundWallet } = useFundWallet();

  const startOnramp = useCallback(
    async (address: string) => {
      await fundWallet({
        address,
        chain: base,
        asset: 'USDC',
        amount: DEFAULT_USDC_AMOUNT,
      });
    },
    [fundWallet],
  );

  return { startOnramp };
}
