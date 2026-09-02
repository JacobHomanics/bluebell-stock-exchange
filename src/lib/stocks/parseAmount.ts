import { parseUnits } from 'viem';

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

export function isAmountInputPartial(value: string): boolean {
  return value === '' || value === '.' || /^\d+\.$/.test(value);
}
