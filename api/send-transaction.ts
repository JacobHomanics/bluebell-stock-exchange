import {
  APIError,
  PrivyClient,
  isEmbeddedWalletLinkedAccount,
  type User,
} from '@privy-io/node';

const BASE_CAIP2 = 'eip155:8453' as const;
const BASE_CHAIN_ID = 8453;
const HASH_WAIT_MS = 25_000;
const HASH_POLL_MS = 750;

export const config = {
  maxDuration: 30,
};

type IncomingMessage = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ServerResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ServerResponse;
  json: (body: unknown) => void;
  end: () => void;
};

type SendBody = {
  to?: unknown;
  data?: unknown;
  value?: unknown;
  from?: unknown;
};

function header(
  req: IncomingMessage,
  name: string,
): string | undefined {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function setCors(req: IncomingMessage, res: ServerResponse) {
  const origin = header(req, 'origin') ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Vary', 'Origin');
}

function bearerToken(req: IncomingMessage): string | null {
  const value = header(req, 'authorization');
  if (!value?.startsWith('Bearer ')) {
    return null;
  }
  const token = value.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function isHex(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]*$/.test(value);
}

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function privyErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    const body = error.error;
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      for (const key of ['error', 'message', 'cause']) {
        const value = record[key];
        if (typeof value === 'string' && value.length > 0) {
          return value;
        }
      }
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Failed to send the transaction.';
}

function createPrivyClient() {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('Missing PRIVY_APP_SECRET or EXPO_PUBLIC_PRIVY_APP_ID');
  }
  return new PrivyClient({ appId, appSecret });
}

function walletIdForAddress(user: User, from: string): string {
  const target = from.toLowerCase();
  for (const account of user.linked_accounts) {
    if (
      !isEmbeddedWalletLinkedAccount(account) ||
      account.chain_type !== 'ethereum'
    ) {
      continue;
    }
    if (account.address.toLowerCase() !== target) {
      continue;
    }
    if (typeof account.id === 'string' && account.id.length > 0) {
      return account.id;
    }
  }
  throw new Error('No Privy embedded wallet found for this account.');
}

async function waitForHash(
  privy: PrivyClient,
  hash: string,
  transactionId: string | undefined,
): Promise<string> {
  if (hash.startsWith('0x') && hash.length > 2) {
    return hash;
  }
  if (!transactionId) {
    throw new Error('Privy did not return a transaction hash.');
  }

  const deadline = Date.now() + HASH_WAIT_MS;
  while (Date.now() < deadline) {
    const transaction = await privy.transactions().get(transactionId);
    const nextHash = transaction.transaction_hash;
    if (nextHash?.startsWith('0x') && nextHash.length > 2) {
      if (
        transaction.status === 'execution_reverted' ||
        transaction.status === 'failed'
      ) {
        throw new Error('Transaction reverted.');
      }
      return nextHash;
    }
    if (
      transaction.status === 'execution_reverted' ||
      transaction.status === 'failed' ||
      transaction.status === 'replaced'
    ) {
      throw new Error('Transaction failed.');
    }
    await sleep(HASH_POLL_MS);
  }

  throw new Error('Timed out waiting for the USDC-gas transaction.');
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const accessToken = bearerToken(req);
  if (!accessToken) {
    res.status(401).json({ error: 'Missing access token.' });
    return;
  }

  const body = (req.body ?? {}) as SendBody;
  if (!isAddress(body.to) || !isHex(body.data) || !isHex(body.value)) {
    res.status(400).json({ error: 'Invalid transaction.' });
    return;
  }
  if (!isAddress(body.from)) {
    res.status(400).json({ error: 'Invalid sender.' });
    return;
  }

  try {
    const privy = createPrivyClient();
    const claims = await privy.utils().auth().verifyAccessToken(accessToken);
    const user = await privy.users()._get(claims.user_id);
    const walletId = walletIdForAddress(user, body.from);

    const sent = await privy.wallets().ethereum().sendTransaction(walletId, {
      caip2: BASE_CAIP2,
      sponsor: true,
      sponsor_options: { asset: 'usdc' },
      params: {
        transaction: {
          to: body.to,
          data: body.data,
          value: body.value,
          chain_id: BASE_CHAIN_ID,
        },
      },
      authorization_context: { user_jwts: [accessToken] },
    });

    const hash = await waitForHash(privy, sent.hash, sent.transaction_id);
    res.status(200).json({ hash });
  } catch (error) {
    const message = privyErrorMessage(error);
    const status = error instanceof APIError && error.status ? error.status : 500;
    res.status(status).json({ error: message });
  }
}
