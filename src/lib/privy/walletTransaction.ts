import { Platform } from 'react-native';
import type { Address, Hex } from 'viem';

export type WalletTransactionRequest = {
  to: Address;
  data: Hex;
  value: bigint;
};

export class UserPaysUnavailableError extends Error {
  constructor(message = 'User-pays gas is not available.') {
    super(message);
    this.name = 'UserPaysUnavailableError';
  }
}

function toHexQuantity(value: bigint): Hex {
  return `0x${value.toString(16)}`;
}

function apiOrigin(): string {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location?.origin
  ) {
    return window.location.origin;
  }

  return process.env.EXPO_PUBLIC_APP_ORIGIN?.replace(/\/$/, '') ?? '';
}

export async function sendUserPaysTransaction(
  accessToken: string,
  from: Address,
  request: WalletTransactionRequest,
): Promise<Hex> {
  const origin = apiOrigin();
  if (!origin.startsWith('http')) {
    throw new UserPaysUnavailableError();
  }

  let response: Response;
  try {
    response = await fetch(`${origin}/api/send-transaction`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: request.to,
        data: request.data,
        value: toHexQuantity(request.value),
      }),
    });
  } catch {
    throw new UserPaysUnavailableError();
  }

  if (response.status === 404 || response.status === 405) {
    throw new UserPaysUnavailableError();
  }

  const payload = (await response.json().catch(() => null)) as {
    hash?: unknown;
    error?: unknown;
  } | null;

  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'Failed to send the transaction.';
    throw new Error(message);
  }

  if (
    !payload ||
    typeof payload.hash !== 'string' ||
    !payload.hash.startsWith('0x')
  ) {
    throw new Error('Wallet did not return a transaction hash.');
  }

  return payload.hash as Hex;
}
