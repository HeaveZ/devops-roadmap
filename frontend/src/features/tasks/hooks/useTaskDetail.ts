import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasksApi';

export function useTaskDetail(id: number | string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.detail(id),
    enabled: !!id,
  });
}
