import { useCallback, useEffect, useState } from 'react';

import {
  fetchTokenizedStockQuotes,
  placeholderQuotes,
  type StockQuote,
} from '@/lib/stocks/fetchQuotes';

const REFRESH_INTERVAL_MS = 60_000;

export function useTokenizedStockQuotes() {
  const [quotes, setQuotes] = useState<StockQuote[]>(placeholderQuotes);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = () =>
      fetchTokenizedStockQuotes()
        .then((next) => {
          if (cancelled) {
            return;
          }
          setQuotes(next);
          setErrorMessage(null);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          console.error(error);
          setErrorMessage('Could not load prices. Pull to retry.');
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });

    void run();
    const intervalId = setInterval(() => {
      void run();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchTokenizedStockQuotes()
      .then((next) => {
        setQuotes(next);
        setErrorMessage(null);
      })
      .catch((error) => {
        console.error(error);
        setErrorMessage('Could not load prices. Pull to retry.');
      })
      .finally(() => {
        setIsRefreshing(false);
        setIsLoading(false);
      });
  }, []);

  return {
    quotes,
    errorMessage,
    isLoading,
    isRefreshing,
    refresh,
  };
}
