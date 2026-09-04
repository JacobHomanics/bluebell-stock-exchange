"use node";

import { APIError, type PrivyClient } from "@privy-io/node";
import { v } from "convex/values";

import { getAuthorizationContext, getPrivyClient } from "./lib/privy";
import { action } from "./_generated/server";

const BASE_CAIP2 = "eip155:8453" as const;
const BASE_CHAIN_ID = 8453;
const HASH_WAIT_MS = 120_000;
const HASH_POLL_MS = 1_200;

const TERMINAL_FAILURE_STATUSES = new Set([
  "failed",
  "execution_reverted",
  "provider_error",
  "replaced",
]);

function isHex(value: string): boolean {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function privyErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    const body = error.error;
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      for (const key of ["error", "message", "cause"]) {
        const value = record[key];
        if (typeof value === "string" && value.length > 0) {
          return value;
        }
      }
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Failed to send the transaction.";
}

async function resolveWalletId(
  privy: PrivyClient,
  from: string,
): Promise<string> {
  const wallet = await privy.wallets().getWalletByAddress({ address: from });
  if (!wallet?.id) {
    throw new Error("No Privy embedded wallet found for this account.");
  }
  return wallet.id;
}

async function waitForHash(
  privy: PrivyClient,
  hash: string,
  transactionId: string | undefined,
): Promise<string> {
  if (hash.startsWith("0x") && hash.length > 2) {
    return hash;
  }
  if (!transactionId) {
    throw new Error("Privy did not return a transaction hash.");
  }

  const deadline = Date.now() + HASH_WAIT_MS;
  while (Date.now() < deadline) {
    const transaction = await privy.transactions().get(transactionId);
    const nextHash = transaction.transaction_hash;
    if (nextHash?.startsWith("0x") && nextHash.length > 2) {
      if (TERMINAL_FAILURE_STATUSES.has(transaction.status)) {
        throw new Error("Transaction reverted.");
      }
      return nextHash;
    }
    if (TERMINAL_FAILURE_STATUSES.has(transaction.status)) {
      throw new Error(
        `Privy transaction ${transactionId} failed with status ${transaction.status}`,
      );
    }
    await sleep(HASH_POLL_MS);
  }

  throw new Error("Timed out waiting for the sponsored transaction.");
}

export const sendSponsored = action({
  args: {
    from: v.string(),
    to: v.string(),
    data: v.string(),
    value: v.string(),
  },
  returns: v.object({
    hash: v.string(),
  }),
  handler: async (_ctx, args) => {
    if (
      !isAddress(args.from) ||
      !isAddress(args.to) ||
      !isHex(args.data) ||
      !isHex(args.value)
    ) {
      throw new Error("Invalid transaction.");
    }

    try {
      const privy = getPrivyClient();
      const walletId = await resolveWalletId(privy, args.from);
      const authorizationContext = getAuthorizationContext();

      // App pays: sponsor: true with no sponsor_options.
      const sent = await privy.wallets().ethereum().sendTransaction(walletId, {
        caip2: BASE_CAIP2,
        sponsor: true,
        params: {
          transaction: {
            to: args.to,
            data: args.data,
            value: args.value,
            chain_id: BASE_CHAIN_ID,
          },
        },
        authorization_context: authorizationContext,
      });

      const hash = await waitForHash(privy, sent.hash, sent.transaction_id);
      return { hash };
    } catch (error) {
      throw new Error(privyErrorMessage(error));
    }
  },
});
