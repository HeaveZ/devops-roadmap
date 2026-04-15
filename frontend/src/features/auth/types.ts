export interface User {
  email: string;
  userId?: number | string;
  avatarData?: string | null;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface VerifyCodePayload {
  email: string;
  code: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AuthTokenResponse {
  token: string;
  email: string;
  userId?: number | string;
  avatarData?: string | null;
}

export interface AuthFlowResponse {
  requiresVerification?: boolean;
  token?: string;
  email?: string;
  userId?: number | string;
  avatarData?: string | null;
  error?: string;
}
