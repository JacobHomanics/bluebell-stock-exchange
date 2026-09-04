import { v } from "convex/values";

import { query } from "./_generated/server";

const MIN_SWAP_USD = 0.05;

export const minSwapUsd = query({
  args: {},
  returns: v.number(),
  handler: async () => MIN_SWAP_USD,
});
