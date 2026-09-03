import { PrivyProvider as ExpoPrivyProvider } from '@privy-io/expo';
import { PrivyElements } from '@privy-io/expo/ui';
import type { ReactNode } from 'react';

export function PrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.EXPO_PUBLIC_PRIVY_MOBILE_CLIENT_ID;

  if (!appId) {
    throw new Error('Missing EXPO_PUBLIC_PRIVY_APP_ID');
  }

  if (!clientId) {
    throw new Error('Missing EXPO_PUBLIC_PRIVY_MOBILE_CLIENT_ID');
  }

  return (
    <ExpoPrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        embedded: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <PrivyElements />
      {children}
    </ExpoPrivyProvider>
  );
}
