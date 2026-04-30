import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, type CreateTaskPayload } from '../api/tasksApi';
import { tasksQueryKey } from './useTasks';
import type { Task } from '../types';

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(payload),
    onSuccess: (created) => {
      qc.setQueryData<Task[]>(tasksQueryKey, (current) => [
        ...(current ?? []),
        { ...created, subtasks: [], comments: [], labels: [] },
      ]);
    },
  });
}
