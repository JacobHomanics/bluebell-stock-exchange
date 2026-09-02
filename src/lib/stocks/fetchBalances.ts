import { formatUnits, parseAbi, type Address } from 'viem';

import { TOKENIZED_STOCKS } from '@/constants/tokenizedStocks';
import { USDC_ON_BASE } from '@/constants/tradeAssets';
import { basePublicClient } from '@/lib/stocks/baseClient';
import { readBalance } from '@/lib/stocks/erc20';

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export type TokenBalance = {
  tokenAddress: string;
  amount: number;
};

export const EMPTY_BALANCES: TokenBalance[] = TOKENIZED_STOCKS.map((stock) => ({
  tokenAddress: stock.tokenAddress,
  amount: 0,
}));

export async function fetchUsdcBalance(owner: Address): Promise<number> {
  const raw = await readBalance(USDC_ON_BASE.tokenAddress, owner);
  return Number(formatUnits(raw, USDC_ON_BASE.decimals));
}

export async function fetchTokenizedStockBalances(
  owner: Address,
): Promise<TokenBalance[]> {
  const [balanceResults, decimalsResults] = await Promise.all([
    basePublicClient.multicall({
      contracts: TOKENIZED_STOCKS.map((stock) => ({
        address: stock.tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf' as const,
        args: [owner] as const,
      })),
    }),
    basePublicClient.multicall({
      contracts: TOKENIZED_STOCKS.map((stock) => ({
        address: stock.tokenAddress,
        abi: erc20Abi,
        functionName: 'decimals' as const,
      })),
    }),
  ]);

  return TOKENIZED_STOCKS.map((stock, index) => {
    const balanceResult = balanceResults[index];
    const decimalsResult = decimalsResults[index];
    if (!balanceResult || balanceResult.status !== 'success') {
      return {
        tokenAddress: stock.tokenAddress,
        amount: 0,
      };
    }

    const decimals =
      decimalsResult?.status === 'success' ? decimalsResult.result : 18;

    return {
      tokenAddress: stock.tokenAddress,
      amount: Number(formatUnits(balanceResult.result, decimals)),
    };
  });
}

export function formatShares(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(amount);
}
