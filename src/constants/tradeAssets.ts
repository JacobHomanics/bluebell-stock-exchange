import type { Address } from 'viem';

import { TOKENIZED_STOCKS } from '@/constants/tokenizedStocks';

export type TradeAssetKind = 'cash' | 'stock';

export type TradeAsset = {
  id: string;
  symbol: string;
  name: string;
  tokenAddress: Address;
  decimals: number;
  logoUri: string;
  kind: TradeAssetKind;
};

/** Native USDC on Base, the quote asset for B20 pools. */
export const USDC_ON_BASE: TradeAsset = {
  id: 'USDC',
  symbol: 'USDC',
  name: 'USD Coin',
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  decimals: 6,
  logoUri:
    'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  kind: 'cash',
};

const B20_DECIMALS = 8;

export const TRADE_ASSETS: readonly TradeAsset[] = [
  USDC_ON_BASE,
  ...TOKENIZED_STOCKS.map((stock) => ({
    id: stock.symbol,
    symbol: stock.symbol,
    name: stock.name,
    tokenAddress: stock.tokenAddress,
    decimals: B20_DECIMALS,
    logoUri: stock.logoUri,
    kind: 'stock' as const,
  })),
];

export function getTradeAsset(id: string | undefined): TradeAsset | undefined {
  if (!id) {
    return undefined;
  }

  const needle = id.toLowerCase();
  return TRADE_ASSETS.find(
    (asset) =>
      asset.id.toLowerCase() === needle ||
      asset.symbol.toLowerCase() === needle,
  );
}
