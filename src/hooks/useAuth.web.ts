import { usePrivy } from '@privy-io/react-auth';

export function useAuth() {
  const { user, ready, authenticated, logout, error } = usePrivy();

  return {
    isReady: ready,
    isAuthenticated: authenticated,
    user,
    logout,
    error: error ?? null,
  };
}
