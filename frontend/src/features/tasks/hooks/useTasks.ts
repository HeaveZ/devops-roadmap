import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasksApi';
import type { Task } from '../types';

export const tasksQueryKey = ['tasks'] as const;

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: tasksQueryKey,
    queryFn: tasksApi.list,
  });
}
