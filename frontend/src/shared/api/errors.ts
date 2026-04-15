import { AxiosError, isAxiosError } from 'axios';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ error?: string; message?: string }>;
    const status = axiosErr.response?.status;
    const payload = axiosErr.response?.data;
    const message =
      payload?.error ??
      payload?.message ??
      axiosErr.message ??
      'Sunucuya baglanilamadi';
    return new ApiError(message, status, payload);
  }
  if (error instanceof Error) return new ApiError(error.message);
  return new ApiError('Bilinmeyen hata');
}
