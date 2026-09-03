import { formatUnits, parseUnits } from 'viem';

export const USD_INPUT_DECIMALS = 6;

export function parseAmountInput(
  value: string,
  decimals: number,
): bigint | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '.') {
    return null;
  }

  const match = trimmed.match(/^(\d*)(\.(\d*))?$/);
  if (!match) {
    return null;
  }

  const fraction = match[3] ?? '';
  if (fraction.length > decimals) {
    return null;
  }

  try {
    return parseUnits(trimmed, decimals);
  } catch {
    return null;
  }
}

export function parseUsdInput(value: string): number | null {
  const raw = parseAmountInput(value, USD_INPUT_DECIMALS);
  if (raw == null) {
    return null;
  }

  return Number(raw) / 10 ** USD_INPUT_DECIMALS;
}

/** Convert a USD keypad amount into a token amount using `priceUsd` per token. */
export function usdInputToTokenAmount(
  value: string,
  decimals: number,
  priceUsd: number | null,
): bigint | null {
  if (priceUsd == null || priceUsd <= 0) {
    return null;
  }

  const usdNumber = parseUsdInput(value);
  if (usdNumber == null || usdNumber <= 0) {
    return null;
  }

  const tokenNumber = usdNumber / priceUsd;
  if (!Number.isFinite(tokenNumber) || tokenNumber <= 0) {
    return null;
  }

  try {
    return parseUnits(tokenNumber.toFixed(decimals), decimals);
  } catch {
    return null;
  }
}

export function formatUsdAmountInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  return value
    .toFixed(USD_INPUT_DECIMALS)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

export function formatTokenAmountInput(raw: bigint, decimals: number): string {
  if (raw <= 0n) {
    return '';
  }

  return formatUnits(raw, decimals)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

export function tokenAmountToUsd(
  raw: bigint,
  decimals: number,
  priceUsd: number | null,
): number | null {
  if (priceUsd == null || priceUsd <= 0) {
    return null;
  }

  const tokens = Number(formatUnits(raw, decimals));
  if (!Number.isFinite(tokens)) {
    return null;
  }

  return tokens * priceUsd;
}

export function isAmountInputPartial(value: string): boolean {
  return value === '' || value === '.' || /^\d+\.$/.test(value);
}

export type AmountKeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | 'backspace';

const MAX_INTEGER_DIGITS = 12;

/** Apply a keypad key to a decimal amount string, keeping it parseable. */
export function applyAmountKey(
  value: string,
  key: AmountKeypadKey,
  maxDecimals: number,
): string {
  if (key === 'backspace') {
    const next = value.slice(0, -1);
    return next === '0' ? '' : next;
  }

  if (key === '.') {
    if (maxDecimals <= 0 || value.includes('.')) {
      return value;
    }
    return value === '' ? '0.' : `${value}.`;
  }

  const next = value === '0' ? key : `${value}${key}`;
  const [integer = '', fraction = ''] = next.split('.');
  if (integer.length > MAX_INTEGER_DIGITS || fraction.length > maxDecimals) {
    return value;
  }
  if (
    !isAmountInputPartial(next) &&
    parseAmountInput(next, maxDecimals) == null
  ) {
    return value;
  }

  return next;
}
