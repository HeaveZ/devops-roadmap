import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notificationsApi';
import { notificationsQueryKey, unreadCountQueryKey } from './useNotifications';

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationsQueryKey });
      qc.invalidateQueries({ queryKey: unreadCountQueryKey });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationsQueryKey });
      qc.invalidateQueries({ queryKey: unreadCountQueryKey });
    },
  });
}
