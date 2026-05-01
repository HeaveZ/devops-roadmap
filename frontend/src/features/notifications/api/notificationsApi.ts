import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type { Notification } from 'features/tasks/types';

export const notificationsApi = {
  list: (unread?: boolean) =>
    apiClient
      .get<Notification[]>(endpoints.notifications.list, { params: unread ? { unread: 'true' } : {} })
      .then((r) => r.data),

  unreadCount: () =>
    apiClient
      .get<{ count: number }>(endpoints.notifications.unreadCount)
      .then((r) => r.data.count),

  markRead: (id: number | string) =>
    apiClient.patch(endpoints.notifications.markRead(id)).then((r) => r.data),

  markAllRead: () =>
    apiClient.post(endpoints.notifications.markAllRead).then((r) => r.data),
};
