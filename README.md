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

Then open iOS, Android, or web from the Expo CLI (`i`, `a`, or `w`).
