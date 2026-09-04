import { ConvexProvider as ReactConvexProvider, ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL?.replace(/\/$/, '') ?? '';

const convex = convexUrl.startsWith('https://')
  ? new ConvexReactClient(convexUrl)
  : null;

export function ConvexProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    throw new Error('Missing EXPO_PUBLIC_CONVEX_URL');
  }

  return (
    <ReactConvexProvider client={convex}>{children}</ReactConvexProvider>
  );
}
