import { useFiatOnramp } from '@privy-io/react-auth';
import { useCallback } from 'react';

import { USDC_ON_BASE } from '@/constants/tradeAssets';

const BASE_CAIP2 = 'eip155:8453' as const;
const DEFAULT_USD_AMOUNT = '5';

export function useUsdcOnramp() {
  const { fund } = useFiatOnramp();

  const startOnramp = useCallback(
    async (address: string) => {
      await fund({
        source: {
          assets: ['usd'],
          defaultAsset: 'usd',
        },
        destination: {
          asset: USDC_ON_BASE.tokenAddress,
          chain: BASE_CAIP2,
          address,
        },
        defaultAmount: DEFAULT_USD_AMOUNT,
      });
    },
    [fund],
  );

  return { startOnramp };
}
