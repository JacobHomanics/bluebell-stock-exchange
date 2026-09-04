import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    PRIVY_APP_ID: v.string(),
    PRIVY_APP_SECRET: v.optional(v.string()),
    PRIVY_AUTHORIZATION_PRIVATE_KEY: v.optional(v.string()),
  },
});

export default app;
