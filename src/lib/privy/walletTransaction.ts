import { ConvexHttpClient } from 'convex/browser';
import type { Address, Hex } from 'viem';

import { api } from '../../../convex/_generated/api';

export type WalletTransactionRequest = {
  to: Address;
  data: Hex;
  value: bigint;
};

export class SponsoredTransactionUnavailableError extends Error {
  constructor(message = 'App-pays gas sponsorship is not available.') {
    super(message);
    this.name = 'SponsoredTransactionUnavailableError';
  }
}

function toHexQuantity(value: bigint): Hex {
  return `0x${value.toString(16)}`;
}

function convexUrl(): string {
  return process.env.EXPO_PUBLIC_CONVEX_URL?.replace(/\/$/, '') ?? '';
}

function isUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /network|failed to fetch|load failed|could not find public function|does not exist/i.test(
      message,
    )
  );
}

export async function sendSponsoredTransaction(
  from: Address,
  request: WalletTransactionRequest,
): Promise<Hex> {
  const url = convexUrl();
  if (!url.startsWith('https://')) {
    throw new SponsoredTransactionUnavailableError();
  }

  const client = new ConvexHttpClient(url);

  let payload: { hash: string };
  try {
    payload = await client.action(api.sendTransaction.sendSponsored, {
      from,
      to: request.to,
      data: request.data,
      value: toHexQuantity(request.value),
    });
  } catch (error) {
    if (isUnavailable(error)) {
      throw new SponsoredTransactionUnavailableError();
    }
    const message =
      error instanceof Error && error.message.length > 0
        ? error.message
        : 'Failed to send the transaction.';
    throw new Error(message);
  }

  if (!payload.hash.startsWith('0x')) {
    throw new Error('Wallet did not return a transaction hash.');
  }

  return payload.hash as Hex;
}
