import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/authApi';

export const useLogin = () => useMutation({ mutationFn: authApi.login });
