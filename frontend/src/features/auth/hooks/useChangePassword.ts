import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/authApi';

export const useChangePassword = () =>
  useMutation({ mutationFn: authApi.changePassword });
