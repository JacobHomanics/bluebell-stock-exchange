import { useQuery } from 'convex/react';

import { api } from '../../convex/_generated/api';

export function useMinSwapUsd(): number | null {
  const minSwapUsd = useQuery(api.tradeConfig.minSwapUsd);
  return minSwapUsd ?? null;
}
