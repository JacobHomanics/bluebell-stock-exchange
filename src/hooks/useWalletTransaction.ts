import type { Address, Hex } from 'viem';
import { getAddress, isAddress } from 'viem';

import { useEmbeddedEthereumWallet } from '@privy-io/expo';

import {
  sendSponsoredTransaction,
  SponsoredTransactionUnavailableError,
  type WalletTransactionRequest,
} from '@/lib/privy/walletTransaction';

export type { WalletTransactionRequest };

const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_ID_HEX = '0x2105';

function toHexQuantity(value: bigint): Hex {
  return `0x${value.toString(16)}`;
}

function asAddress(value: string | undefined): Address | null {
  if (!value || !isAddress(value)) {
    return null;
  }
  return getAddress(value);
}

export function useWalletTransaction() {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets[0];
  const address = asAddress(wallet?.address);

  const sendTransaction = async (
    request: WalletTransactionRequest,
  ): Promise<Hex> => {
    if (!wallet) {
      throw new Error('No wallet is linked to this account yet.');
    }

    const provider = await wallet.getProvider();
    const accounts = (await provider.request({
      method: 'eth_requestAccounts',
    })) as string[];
    const from = asAddress(accounts[0]) ?? address;
    if (!from) {
      throw new Error('No wallet is linked to this account yet.');
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch {
      // Some embedded wallets are already on Base or do not implement switch.
    }

    try {
      return await sendSponsoredTransaction(from, request);
    } catch (error) {
      if (!(error instanceof SponsoredTransactionUnavailableError)) {
        throw error;
      }
    }

    const hash = (await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to: request.to,
          data: request.data,
          value: toHexQuantity(request.value),
          chainId: BASE_CHAIN_ID_HEX,
        },
      ],
    })) as string;

    if (!hash?.startsWith('0x')) {
      throw new Error('Wallet did not return a transaction hash.');
    }

    return hash as Hex;
  };

  return {
    address,
    chainId: BASE_CHAIN_ID,
    sendTransaction,
  };
}
