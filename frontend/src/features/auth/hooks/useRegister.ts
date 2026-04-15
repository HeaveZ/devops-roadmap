import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/authApi';

export const useRegister = () => useMutation({ mutationFn: authApi.register });
