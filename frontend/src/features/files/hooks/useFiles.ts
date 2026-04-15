import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'features/auth/context/AuthContext';
import { filesApi } from '../api/filesApi';

export const filesQueryKey = ['files'] as const;

export function useFiles() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: filesQueryKey,
    queryFn: filesApi.list,
    enabled: isAuthenticated,
  });
}
