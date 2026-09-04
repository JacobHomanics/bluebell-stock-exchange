import { PrivyClient } from "@privy-io/node";
import type { AuthorizationContext } from "@privy-io/node";

import { env } from "../_generated/server";

export function getPrivyClient(): PrivyClient {
  if (!env.PRIVY_APP_SECRET) {
    throw new Error("Missing PRIVY_APP_SECRET on the Convex deployment.");
  }
  return new PrivyClient({
    appId: env.PRIVY_APP_ID,
    appSecret: env.PRIVY_APP_SECRET,
  });
}

/** Authorization context for server-driven wallet sends. */
export function getAuthorizationContext(): AuthorizationContext {
  const authorizationPrivateKey = env.PRIVY_AUTHORIZATION_PRIVATE_KEY?.trim();
  if (!authorizationPrivateKey) {
    throw new Error(
      "Missing PRIVY_AUTHORIZATION_PRIVATE_KEY on the Convex deployment.",
    );
  }
  return {
    authorization_private_keys: [authorizationPrivateKey],
  };
}
