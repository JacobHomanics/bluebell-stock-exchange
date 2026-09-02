import { formatUnits, parseAbi } from 'viem';

import { TOKENIZED_STOCKS } from '@/constants/tokenizedStocks';
import { basePublicClient } from '@/lib/stocks/baseClient';

const PRICE_DECIMALS = 8;

const chainlinkAggregatorV3Abi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
]);

export type StockQuote = {
  symbol: string;
  name: string;
  logoUri: string;
  tokenAddress: string;
  priceUsd: number | null;
  updatedAt: Date | null;
};

export function placeholderQuotes(): StockQuote[] {
  return TOKENIZED_STOCKS.map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    logoUri: stock.logoUri,
    tokenAddress: stock.tokenAddress,
    priceUsd: null,
    updatedAt: null,
  }));
}

export async function fetchTokenizedStockQuotes(): Promise<StockQuote[]> {
  const results = await basePublicClient.multicall({
    contracts: TOKENIZED_STOCKS.map((stock) => ({
      address: stock.priceFeedAddress,
      abi: chainlinkAggregatorV3Abi,
      functionName: 'latestRoundData' as const,
    })),
  });

  return TOKENIZED_STOCKS.map((stock, index) => {
    const result = results[index];
    if (!result || result.status !== 'success') {
      return {
        symbol: stock.symbol,
        name: stock.name,
        logoUri: stock.logoUri,
        tokenAddress: stock.tokenAddress,
        priceUsd: null,
        updatedAt: null,
      };
    }

    const [, answer, , updatedAt] = result.result;
    if (answer <= 0n) {
      return {
        symbol: stock.symbol,
        name: stock.name,
        logoUri: stock.logoUri,
        tokenAddress: stock.tokenAddress,
        priceUsd: null,
        updatedAt: null,
      };
    }

    return {
      symbol: stock.symbol,
      name: stock.name,
      logoUri: stock.logoUri,
      tokenAddress: stock.tokenAddress,
      priceUsd: Number(formatUnits(answer, PRICE_DECIMALS)),
      updatedAt: new Date(Number(updatedAt) * 1000),
    };
  });
}

export function formatUsd(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}
