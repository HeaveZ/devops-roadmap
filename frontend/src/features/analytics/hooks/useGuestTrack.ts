import { useCallback } from 'react';
import { useAuth } from 'features/auth/context/AuthContext';
import { trackApi } from '../api/trackApi';

export function useGuestTrack() {
  const { isAuthenticated } = useAuth();
  return useCallback(
    (action: string, details?: string) => {
      if (isAuthenticated) return;
      void trackApi.track(action, details);
    },
    [isAuthenticated],
  );
}
