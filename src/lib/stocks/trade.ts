import { formatUnits } from 'viem';

import {
  getTradeAsset,
  TRADE_ASSETS,
  USDC_ON_BASE,
  type TradeAsset,
} from '@/constants/tradeAssets';
import { type StockQuote } from '@/lib/stocks/fetchQuotes';
import { SwapQuoteError } from '@/lib/stocks/lifi';

export type TradeInputUnit = 'usd' | 'token';

export function isBelowMinSwapUsd(
  usd: number | null,
  minSwapUsd: number,
): boolean {
  return usd == null || !Number.isFinite(usd) || usd < minSwapUsd;
}

export function defaultFromAsset(fromSymbol?: string): TradeAsset {
  return getTradeAsset(fromSymbol) ?? USDC_ON_BASE;
}

export function defaultToAsset(
  toSymbol?: string,
  fromAsset?: TradeAsset,
): TradeAsset {
  const requested = getTradeAsset(toSymbol);
  if (requested && requested.id !== fromAsset?.id) {
    return requested;
  }

  const fallback = TRADE_ASSETS.find(
    (asset) => asset.kind === 'stock' && asset.id !== fromAsset?.id,
  );
  return fallback ?? TRADE_ASSETS[1] ?? USDC_ON_BASE;
}

export function assetPriceUsd(
  asset: TradeAsset,
  quotes: readonly StockQuote[],
): number | null {
  if (asset.kind === 'cash') {
    return 1;
  }

  return quotes.find((item) => item.symbol === asset.symbol)?.priceUsd ?? null;
}

export function inputAssetUsdValue(
  asset: TradeAsset,
  rawBalance: bigint,
  quotes: readonly StockQuote[],
): number | null {
  const amount = Number(formatUnits(rawBalance, asset.decimals));
  if (!Number.isFinite(amount)) {
    return null;
  }
  if (asset.kind === 'cash') {
    return amount;
  }

  const quote = quotes.find((item) => item.symbol === asset.symbol);
  if (quote?.priceUsd == null) {
    return null;
  }

  return amount * quote.priceUsd;
}

export function swapErrorMessage(error: unknown): string {
  if (error instanceof SwapQuoteError) {
    return error.message;
  }

  const text = error instanceof Error ? error.message : String(error);
  if (text.includes('TRANSFER_FROM_FAILED')) {
    return 'Token approval is not live yet. Wait a moment and try again.';
  }
  if (text.includes('Transaction reverted')) {
    return 'The swap transaction reverted. Try a fresh quote.';
  }
  if (/insufficient balance/i.test(text)) {
    return 'Not enough USDC to cover this trade.';
  }
  if (
    /insufficient funds for gas/i.test(text) ||
    /insufficient funds/i.test(text)
  ) {
    return 'Not enough funds to pay gas. Try again.';
  }

  return 'Swap failed. Check gas, allowance, and try again.';
}
