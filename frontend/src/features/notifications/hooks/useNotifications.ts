import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../api/notificationsApi';

export const notificationsQueryKey = ['notifications'] as const;
export const unreadCountQueryKey = ['notifications', 'unread-count'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => notificationsApi.list(),
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 15000,
  });
}
