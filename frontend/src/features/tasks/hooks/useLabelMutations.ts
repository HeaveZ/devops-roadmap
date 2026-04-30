import { useMutation, useQueryClient } from '@tanstack/react-query';
import { labelsApi } from '../api/labelsApi';
import { tasksApi } from '../api/tasksApi';
import { labelsQueryKey } from './useLabels';
import { tasksQueryKey } from './useTasks';

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      labelsApi.create(name, color),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelsQueryKey }),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => labelsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labelsQueryKey });
      qc.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}

export function useAddTaskLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: number | string; labelId: number }) =>
      tasksApi.addLabel(taskId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}

export function useRemoveTaskLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: number | string; labelId: number | string }) =>
      tasksApi.removeLabel(taskId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
}
