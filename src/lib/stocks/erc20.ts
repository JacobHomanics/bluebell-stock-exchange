import {
  encodeFunctionData,
  formatUnits,
  parseAbi,
  type Address,
  type Hex,
} from 'viem';

import { basePublicClient } from '@/lib/stocks/baseClient';

export const erc20Abi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export function encodeApprove(spender: Address, amount: bigint): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount],
  });
}

export async function readAllowance(
  token: Address,
  owner: Address,
  spender: Address,
): Promise<bigint> {
  return basePublicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
  });
}

export async function waitForAllowance(
  token: Address,
  owner: Address,
  spender: Address,
  minimum: bigint,
  timeoutMs = 15_000,
  intervalMs = 400,
): Promise<bigint> {
  const startedAt = Date.now();

  while (true) {
    const allowance = await readAllowance(token, owner, spender);
    if (allowance >= minimum) {
      return allowance;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(
        'Token approval is taking too long to confirm. Try the swap again.',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export async function readBalance(
  token: Address,
  owner: Address,
): Promise<bigint> {
  return basePublicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner],
  });
}

export function formatTokenAmount(amount: number, maximumFractionDigits = 6): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(amount);
}

export function formatRawTokenAmount(
  raw: bigint,
  decimals: number,
  maximumFractionDigits = 6,
): string {
  return formatTokenAmount(Number(formatUnits(raw, decimals)), maximumFractionDigits);
}
