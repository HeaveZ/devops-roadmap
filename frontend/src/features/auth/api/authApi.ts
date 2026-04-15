import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type {
  AuthFlowResponse,
  AuthTokenResponse,
  ChangePasswordPayload,
  Credentials,
  VerifyCodePayload,
} from '../types';

export const authApi = {
  login: (payload: Credentials) =>
    apiClient
      .post<AuthFlowResponse>(endpoints.auth.login, payload)
      .then((r) => r.data),

  register: (payload: Credentials) =>
    apiClient
      .post<AuthFlowResponse>(endpoints.auth.register, payload)
      .then((r) => r.data),

  verifyCode: (payload: VerifyCodePayload) =>
    apiClient
      .post<AuthTokenResponse>(endpoints.auth.verifyCode, payload)
      .then((r) => r.data),

  verify: () =>
    apiClient
      .get<{ userId?: number | string; email?: string; avatarData?: string | null }>(
        endpoints.auth.verify,
      )
      .then((r) => r.data),

  changePassword: (payload: ChangePasswordPayload) =>
    apiClient
      .post<{ success?: boolean }>(endpoints.profile.changePassword, payload)
      .then((r) => r.data),
};
