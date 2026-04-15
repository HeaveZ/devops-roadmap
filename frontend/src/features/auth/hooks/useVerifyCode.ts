import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/authApi';

export const useVerifyCode = () => useMutation({ mutationFn: authApi.verifyCode });
