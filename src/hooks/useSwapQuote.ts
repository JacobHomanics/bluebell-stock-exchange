import { useEffect, useState } from 'react';
import type { Address } from 'viem';

import {
  fetchSwapQuote,
  SwapQuoteError,
  type LifiQuote,
} from '@/lib/stocks/lifi';

const DEBOUNCE_MS = 400;

type QuoteResult = {
  key: string;
  quote: LifiQuote | null;
  errorMessage: string | null;
};

function quoteKey(input: {
  fromToken: Address;
  toToken: Address;
  fromAmount: bigint | null;
  fromAddress: Address | null;
  enabled: boolean;
}): string | null {
  if (!input.enabled || input.fromAmount == null || input.fromAmount <= 0n) {
    return null;
  }
  if (!input.fromAddress) {
    return null;
  }
  return `${input.fromToken}:${input.toToken}:${input.fromAmount.toString()}:${input.fromAddress}`;
}

export function useSwapQuote(input: {
  fromToken: Address;
  toToken: Address;
  fromAmount: bigint | null;
  fromAddress: Address | null;
  enabled: boolean;
}) {
  const key = quoteKey(input);
  const [result, setResult] = useState<QuoteResult | null>(null);

  useEffect(() => {
    if (!key || input.fromAmount == null || !input.fromAddress) {
      return;
    }

    const fromAmount = input.fromAmount;
    const fromAddress = input.fromAddress;
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void fetchSwapQuote({
        fromToken: input.fromToken,
        toToken: input.toToken,
        fromAmount,
        fromAddress,
      })
        .then((quote) => {
          if (cancelled) {
            return;
          }
          setResult({ key, quote, errorMessage: null });
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          console.error(error);
          setResult({
            key,
            quote: null,
            errorMessage:
              error instanceof SwapQuoteError
                ? error.message
                : 'Could not get a quote. Try a different pair or amount.',
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [input.fromAddress, input.fromAmount, input.fromToken, input.toToken, key]);

  const matches = result?.key === key;

  return {
    quote: matches ? result.quote : null,
    errorMessage: matches ? result.errorMessage : null,
    isLoading: key != null && !matches,
  };
}
