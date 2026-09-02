import { usePrivy } from '@privy-io/expo';

export function useAuth() {
  const { user, isReady, logout, error } = usePrivy();

  return {
    isReady,
    isAuthenticated: user != null,
    user,
    logout,
    error,
  };
}
