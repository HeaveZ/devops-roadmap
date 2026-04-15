import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';

export const trackApi = {
  track: (action: string, details?: string) =>
    apiClient
      .post(endpoints.analytics.track, { action, details })
      .catch(() => undefined),
};
