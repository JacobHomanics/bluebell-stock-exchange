import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Address } from 'viem';

export type BalanceSnapshot = {
  t: number;
  totalUsd: number;
};

export const BALANCE_HISTORY_RANGES = [
  { id: '1h', label: '1H', ms: 60 * 60 * 1000 },
  { id: '12h', label: '12H', ms: 12 * 60 * 60 * 1000 },
  { id: '1d', label: '1D', ms: 24 * 60 * 60 * 1000 },
] as const;

export type BalanceHistoryRangeId = (typeof BALANCE_HISTORY_RANGES)[number]['id'];

export const BALANCE_HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_INTERVAL_MS = 60 * 1000;

function storageKey(owner: Address): string {
  return `balance-history.${owner.toLowerCase()}`;
}

function isSnapshot(value: unknown): value is BalanceSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as { t?: unknown; totalUsd?: unknown };
  return (
    typeof record.t === 'number' &&
    Number.isFinite(record.t) &&
    typeof record.totalUsd === 'number' &&
    Number.isFinite(record.totalUsd)
  );
}

function pruneAndSort(
  snapshots: BalanceSnapshot[],
  now: number,
): BalanceSnapshot[] {
  const cutoff = now - BALANCE_HISTORY_RETENTION_MS;
  return snapshots
    .filter((snapshot) => snapshot.t >= cutoff)
    .sort((left, right) => left.t - right.t);
}

export function snapshotsForRange(
  points: readonly BalanceSnapshot[],
  rangeMs: number,
  now = Date.now(),
): BalanceSnapshot[] {
  const windowStart = now - rangeMs;
  const inWindow = points.filter((point) => point.t >= windowStart);
  let previous: BalanceSnapshot | undefined;
  for (const point of points) {
    if (point.t < windowStart) {
      previous = point;
    }
  }

  if (!previous) {
    return inWindow;
  }

  return [{ t: windowStart, totalUsd: previous.totalUsd }, ...inWindow];
}

export async function readBalanceHistory(
  owner: Address,
): Promise<BalanceSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(owner));
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return pruneAndSort(parsed.filter(isSnapshot), Date.now());
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function recordBalanceSnapshot(
  owner: Address,
  totalUsd: number,
  now = Date.now(),
): Promise<BalanceSnapshot[]> {
  const existing = await readBalanceHistory(owner);
  const pruned = pruneAndSort(existing, now);
  const point: BalanceSnapshot = { t: now, totalUsd };
  const last = pruned[pruned.length - 1];
  const next =
    last && now - last.t < SNAPSHOT_INTERVAL_MS
      ? [...pruned.slice(0, -1), point]
      : [...pruned, point];

  try {
    await AsyncStorage.setItem(storageKey(owner), JSON.stringify(next));
  } catch (error) {
    console.error(error);
  }

  return next;
}
