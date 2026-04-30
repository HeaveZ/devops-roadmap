import { useQuery } from '@tanstack/react-query';
import { activityApi } from '../api/activityApi';

export const activityQueryKey = ['audit-logs'] as const;

export function useActivity(limit = 50, offset = 0) {
  return useQuery({
    queryKey: [...activityQueryKey, limit, offset],
    queryFn: () => activityApi.list(limit, offset),
    refetchInterval: 15000,
  });
}
