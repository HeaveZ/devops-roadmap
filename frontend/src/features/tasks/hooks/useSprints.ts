import { useQuery } from '@tanstack/react-query';
import { sprintsApi } from '../api/sprintsApi';

export const sprintsQueryKey = ['sprints'] as const;

export function useSprints() {
  return useQuery({ queryKey: sprintsQueryKey, queryFn: sprintsApi.list });
}
