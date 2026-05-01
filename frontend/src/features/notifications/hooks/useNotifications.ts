import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'features/auth/context/AuthContext';
import { notificationsApi } from '../api/notificationsApi';

export const notificationsQueryKey = ['notifications'] as const;
export const unreadCountQueryKey = ['notifications', 'unread-count'] as const;

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => notificationsApi.list(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: () => notificationsApi.unreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });
}
