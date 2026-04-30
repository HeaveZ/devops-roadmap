import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type { Label } from '../types';

export const labelsApi = {
  list: () => apiClient.get<Label[]>(endpoints.labels.list).then((r) => r.data),
  create: (name: string, color: string) =>
    apiClient.post<Label>(endpoints.labels.list, { name, color }).then((r) => r.data),
  delete: (id: number | string) =>
    apiClient.delete(endpoints.labels.delete(id)),
};
