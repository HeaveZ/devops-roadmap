import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type { AuditLogResponse } from '../types';

export const activityApi = {
  list: (limit = 50, offset = 0) =>
    apiClient
      .get<AuditLogResponse>(endpoints.auditLogs.list(limit, offset))
      .then((r) => r.data),
};
