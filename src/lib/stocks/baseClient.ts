import { createPublicClient, fallback, http, type Hex } from 'viem';
import { base } from 'viem/chains';

export const basePublicClient = createPublicClient({
  chain: base,
  transport: fallback([
    http('https://mainnet.base.org'),
    http('https://base.llamarpc.com'),
    http('https://base-rpc.publicnode.com'),
  ]),
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
