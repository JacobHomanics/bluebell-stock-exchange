import { getAddress, isAddress, type Address } from 'viem';

type LinkedAccountLike = {
  type?: string;
  address?: string;
  chainType?: string;
  chain_type?: string;
  walletClientType?: string;
  wallet_client_type?: string;
};

function asChecksumAddress(value: unknown): Address | null {
  if (typeof value !== 'string' || !isAddress(value)) {
    return null;
  }

  return getAddress(value);
}

function getLinkedAccounts(user: object): LinkedAccountLike[] {
  const record = user as {
    linkedAccounts?: unknown;
    linked_accounts?: unknown;
  };
  const linked = record.linkedAccounts ?? record.linked_accounts;
  if (!Array.isArray(linked)) {
    return [];
  }

  return linked.filter(
    (account): account is LinkedAccountLike =>
      !!account && typeof account === 'object',
  );
}

function chainTypeOf(account: LinkedAccountLike): string | undefined {
  return account.chainType ?? account.chain_type;
}

function walletClientOf(account: LinkedAccountLike): string | undefined {
  return account.walletClientType ?? account.wallet_client_type;
}

/** Ethereum address for the signed-in Privy user, preferring an embedded wallet. */
export function getEthereumAddress(user: unknown): Address | null {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const record = user as { wallet?: { address?: string } };
  const fromWallet = asChecksumAddress(record.wallet?.address);
  if (fromWallet) {
    return fromWallet;
  }

  const wallets = getLinkedAccounts(user).filter((account) => {
    if (account.type !== 'wallet' && account.type !== 'smart_wallet') {
      return false;
    }

    const chainType = chainTypeOf(account);
    return chainType === 'ethereum' || chainType == null;
  });

  const privyWallet = wallets.find(
    (account) => walletClientOf(account) === 'privy',
  );

  return asChecksumAddress(privyWallet?.address ?? wallets[0]?.address);
}
