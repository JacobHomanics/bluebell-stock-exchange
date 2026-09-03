import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Address } from 'viem';

import { useAuth } from '@/hooks/useAuth';
import { getEthereumAddress } from '@/lib/privy/getEthereumAddress';
import {
  recordBalanceSnapshot,
  type BalanceSnapshot,
} from '@/lib/stocks/balanceHistory';
import {
  EMPTY_BALANCES,
  fetchTokenizedStockBalances,
  fetchUsdcBalance,
  type TokenBalance,
} from '@/lib/stocks/fetchBalances';
import {
  fetchTokenizedStockQuotes,
  placeholderQuotes,
  type StockQuote,
} from '@/lib/stocks/fetchQuotes';

const REFRESH_INTERVAL_MS = 60_000;

export type StockHolding = {
  quote: StockQuote;
  amount: number;
  valueUsd: number | null;
};

export function useTokenizedStockPortfolio() {
  const { user, isAuthenticated } = useAuth();
  const owner = useMemo(() => getEthereumAddress(user), [user]);

  const [quotes, setQuotes] = useState<StockQuote[]>(placeholderQuotes);
  const [fetchedBalances, setFetchedBalances] =
    useState<TokenBalance[]>(EMPTY_BALANCES);
  const [fetchedUsdc, setFetchedUsdc] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceHistory, setBalanceHistory] = useState<{
    owner: Address;
    points: BalanceSnapshot[];
  } | null>(null);

  const load = useCallback(async (): Promise<BalanceSnapshot[] | null> => {
    if (!owner) {
      return null;
    }

    const [nextQuotes, nextBalances, nextUsdc] = await Promise.all([
      fetchTokenizedStockQuotes(),
      fetchTokenizedStockBalances(owner),
      fetchUsdcBalance(owner),
    ]);

    setQuotes(nextQuotes);
    setFetchedBalances(nextBalances);
    setFetchedUsdc(nextUsdc);
    setFetchError(null);

    return recordBalanceSnapshot(
      owner,
      portfolioTotalUsd(nextQuotes, nextBalances, nextUsdc),
    );
  }, [owner]);

  useEffect(() => {
    if (!owner) {
      return;
    }

    let cancelled = false;

    const run = () =>
      load()
        .then((series) => {
          if (cancelled || !series) {
            return;
          }
          setBalanceHistory({ owner, points: series });
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }
          console.error(error);
          setFetchError('Could not load balance. Pull to retry.');
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
  }, [load, owner]);

  const refresh = useCallback(() => {
    if (!owner) {
      return;
    }

    setIsRefreshing(true);
    void load()
      .then((series) => {
        if (series) {
          setBalanceHistory({ owner, points: series });
        }
      })
      .catch((error) => {
        console.error(error);
        setFetchError('Could not load balance. Pull to retry.');
      })
      .finally(() => {
        setIsRefreshing(false);
        setIsLoading(false);
      });
  }, [load, owner]);

  const balances = owner ? fetchedBalances : EMPTY_BALANCES;
  const usdcAmount = owner ? fetchedUsdc : 0;
  const errorMessage = owner ? fetchError : null;

  const holdings = useMemo<StockHolding[]>(() => {
    const amountByAddress = new Map(
      balances.map((balance) => [
        balance.tokenAddress.toLowerCase(),
        balance.amount,
      ]),
    );

    return quotes.map((quote) => {
      const amount = amountByAddress.get(quote.tokenAddress.toLowerCase()) ?? 0;
      return {
        quote,
        amount,
        valueUsd: quote.priceUsd == null ? null : amount * quote.priceUsd,
      };
    });
  }, [balances, quotes]);

  const positions = useMemo(
    () => holdings.filter((holding) => holding.amount > 0),
    [holdings],
  );

  const stocksUsd = useMemo(
    () =>
      holdings.reduce((sum, holding) => {
        if (holding.valueUsd == null) {
          return sum;
        }
        return sum + holding.valueUsd;
      }, 0),
    [holdings],
  );

  const totalUsd = stocksUsd + usdcAmount;
  const visibleHistory =
    owner && balanceHistory?.owner === owner ? balanceHistory.points : [];

  return {
    owner,
    isAuthenticated,
    holdings,
    positions,
    usdcAmount,
    totalUsd,
    balanceHistory: visibleHistory,
    errorMessage,
    isLoading: Boolean(owner) && isLoading,
    isRefreshing,
    refresh,
  };
}

function portfolioTotalUsd(
  quotes: StockQuote[],
  balances: TokenBalance[],
  usdcAmount: number,
): number {
  const amountByAddress = new Map(
    balances.map((balance) => [
      balance.tokenAddress.toLowerCase(),
      balance.amount,
    ]),
  );

  const stocksUsd = quotes.reduce((sum, quote) => {
    if (quote.priceUsd == null) {
      return sum;
    }

    const amount = amountByAddress.get(quote.tokenAddress.toLowerCase()) ?? 0;
    return sum + amount * quote.priceUsd;
  }, 0);

  return stocksUsd + usdcAmount;
}
