/**
 * Key quorum / signer ID from Privy Dashboard → Wallet infrastructure → Authorization keys.
 * The matching private key is Convex env `PRIVY_AUTHORIZATION_PRIVATE_KEY`.
 */
export function getPrivySignerId(): string | null {
  const value = process.env.EXPO_PUBLIC_PRIVY_SIGNER_ID?.trim();
  return value || null;
}
