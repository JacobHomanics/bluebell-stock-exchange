# Bluebell Stock Exchange

Expo app for iOS, Android, and web. Navigation and Privy login follow the same setup as the wallet and Disgo consumer apps.

## Get started

```bash
cp .env.example .env.local
pnpm install
pnpm start
```

Fill in Privy values in `.env.local` from the Privy Dashboard → App settings / App clients:

- `EXPO_PUBLIC_PRIVY_APP_ID`
- `EXPO_PUBLIC_PRIVY_WEB_CLIENT_ID`
- `EXPO_PUBLIC_PRIVY_MOBILE_CLIENT_ID`
- `EXPO_PUBLIC_ALCHEMY_API_KEY` (Base mainnet key from the Alchemy dashboard)
- `EXPO_PUBLIC_CONVEX_URL` (from `npx convex dev`)
- `EXPO_PUBLIC_PRIVY_SIGNER_ID` (key quorum ID from Privy → Wallet infrastructure → Authorization keys)

Swaps are gas-sponsored by the app on Base (Privy app-pays). In the Privy Dashboard, set **Wallet Infrastructure → Gas sponsorship** to **App pays**, and enable Base.

On the Convex deployment, set server-only secrets. `PRIVY_APP_ID` must match `EXPO_PUBLIC_PRIVY_APP_ID`.

```bash
npx convex env set PRIVY_APP_ID=<privy-app-id>
npx convex env set PRIVY_APP_SECRET=<privy-app-secret>
npx convex env set PRIVY_AUTHORIZATION_PRIVATE_KEY 'wallet-auth:...'
```

1. Privy Dashboard → **Wallet infrastructure → Authorization keys** → **Create new key**
2. Save the **key quorum ID** as `EXPO_PUBLIC_PRIVY_SIGNER_ID`
3. Save the **private key** as Convex `PRIVY_AUTHORIZATION_PRIVATE_KEY`
4. Reload the app and log in once so the signer is attached to the wallet

Do not put the app secret or authorization private key in `EXPO_PUBLIC_*`.

Then open iOS, Android, or web from the Expo CLI (`i`, `a`, or `w`).
