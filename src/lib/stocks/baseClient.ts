import { createPublicClient, http, type Hex } from 'viem';
import { base } from 'viem/chains';

const alchemyApiKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;

if (!alchemyApiKey) {
  throw new Error('Missing EXPO_PUBLIC_ALCHEMY_API_KEY');
}

export const basePublicClient = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
});

export async function waitForSuccessReceipt(hash: Hex, confirmations = 1) {
  const receipt = await basePublicClient.waitForTransactionReceipt({
    hash,
    confirmations,
  });
  if (receipt.status !== 'success') {
    throw new Error('Transaction reverted.');
  }
  return receipt;
}
