import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type { Sprint } from '../types';

export const sprintsApi = {
  list: () => apiClient.get<Sprint[]>(endpoints.sprints.list).then((r) => r.data),
  create: (data: { name: string; start_date?: string; end_date?: string }) =>
    apiClient.post<Sprint>(endpoints.sprints.list, data).then((r) => r.data),
  update: (id: number | string, data: Partial<Sprint>) =>
    apiClient.patch<Sprint>(endpoints.sprints.update(id), data).then((r) => r.data),
  delete: (id: number | string) =>
    apiClient.delete(endpoints.sprints.delete(id)),
};
