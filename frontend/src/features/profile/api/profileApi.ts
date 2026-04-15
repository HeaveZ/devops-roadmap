import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';

export const profileApi = {
  uploadAvatar: (avatarData: string) =>
    apiClient
      .post<{ success: boolean; avatarData: string }>(endpoints.profile.avatar, {
        avatarData,
      })
      .then((r) => r.data),
};
