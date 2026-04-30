import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasksApi';
import { tasksQueryKey } from './useTasks';
import type { Task } from '../types';

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, section }: { title: string; section: string }) =>
      tasksApi.create(title, section),
    onSuccess: (created) => {
      qc.setQueryData<Task[]>(tasksQueryKey, (current) => [
        ...(current ?? []),
        { ...created, subtasks: [], comments: [] },
      ]);
    },
  });
}
