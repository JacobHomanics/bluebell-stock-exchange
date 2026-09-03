import { getAddress, isAddress, type Address, type Hex } from 'viem';
import {
  usePrivy,
  useSendTransaction,
  useWallets,
} from '@privy-io/react-auth';

import {
  sendUserPaysTransaction,
  UserPaysUnavailableError,
  type WalletTransactionRequest,
} from '@/lib/privy/walletTransaction';

export type { WalletTransactionRequest };

const BASE_CHAIN_ID = 8453;

function asAddress(value: string | undefined): Address | null {
  if (!value || !isAddress(value)) {
    return null;
  }
  return getAddress(value);
}

export function useWalletTransaction() {
  const { getAccessToken } = usePrivy();
  const { sendTransaction: send } = useSendTransaction();
  const { wallets } = useWallets();
  const wallet =
    wallets.find((item) => item.walletClientType === 'privy') ?? wallets[0];
  const address = asAddress(wallet?.address);

  const sendTransaction = async (
    request: WalletTransactionRequest,
  ): Promise<Hex> => {
    if (wallet) {
      try {
        await wallet.switchChain(BASE_CHAIN_ID);
      } catch {
        // Wallet may already be on Base.
      }
    }

    if (address) {
      const accessToken = await getAccessToken();
      if (accessToken) {
        try {
          return await sendUserPaysTransaction(accessToken, address, request);
        } catch (error) {
          if (!(error instanceof UserPaysUnavailableError)) {
            throw error;
          }
        }
      }
    }

    const result = await send(
      {
        to: request.to,
        data: request.data,
        value: request.value,
        chainId: BASE_CHAIN_ID,
      },
      {
        address: wallet?.address,
        uiOptions: { showWalletUIs: false },
      },
    );

    return result.hash;
  };

  return {
    address,
    chainId: BASE_CHAIN_ID,
    sendTransaction,
  };
}
