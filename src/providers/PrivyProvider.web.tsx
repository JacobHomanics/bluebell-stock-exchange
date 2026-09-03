import { PrivyProvider as WebPrivyProvider } from '@privy-io/react-auth';
import type { ReactNode } from 'react';

export function PrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.EXPO_PUBLIC_PRIVY_WEB_CLIENT_ID;

  if (!appId) {
    throw new Error('Missing EXPO_PUBLIC_PRIVY_APP_ID');
  }

  if (!clientId) {
    throw new Error('Missing EXPO_PUBLIC_PRIVY_WEB_CLIENT_ID');
  }

  return (
    <WebPrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        embeddedWallets: {
          showWalletUIs: false,
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </WebPrivyProvider>
  );
}
