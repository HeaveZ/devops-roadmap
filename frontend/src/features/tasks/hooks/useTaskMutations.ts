import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/tasksApi';
import { tasksQueryKey } from './useTasks';
import type { Subtask, Task, TaskComment } from '../types';

type PatchPayload = { id: Task['id']; patch: Partial<Pick<Task, 'completed' | 'priority'>> };

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: PatchPayload) => tasksApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: tasksQueryKey });
      const prev = qc.getQueryData<Task[]>(tasksQueryKey);
      qc.setQueryData<Task[]>(tasksQueryKey, (current) =>
        (current ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(tasksQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

export function useAddSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: Task['id']; title: string }) =>
      tasksApi.addSubtask(taskId, title),
    onSuccess: (created, { taskId }) => {
      qc.setQueryData<Task[]>(tasksQueryKey, (current) =>
        (current ?? []).map((t) =>
          t.id === taskId ? { ...t, subtasks: [...(t.subtasks ?? []), created] } : t,
        ),
      );
    },
  });
}

export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtask, completed }: { subtask: Subtask; completed: boolean }) =>
      tasksApi.toggleSubtask(subtask.id, completed),
    onMutate: async ({ subtask, completed }) => {
      await qc.cancelQueries({ queryKey: tasksQueryKey });
      const prev = qc.getQueryData<Task[]>(tasksQueryKey);
      qc.setQueryData<Task[]>(tasksQueryKey, (current) =>
        (current ?? []).map((t) => ({
          ...t,
          subtasks: (t.subtasks ?? []).map((s) =>
            s.id === subtask.id ? { ...s, completed } : s,
          ),
        })),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(tasksQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId }: { subtaskId: Subtask['id']; taskId: Task['id'] }) =>
      tasksApi.deleteSubtask(subtaskId),
    onMutate: async ({ subtaskId }) => {
      await qc.cancelQueries({ queryKey: tasksQueryKey });
      const prev = qc.getQueryData<Task[]>(tasksQueryKey);
      qc.setQueryData<Task[]>(tasksQueryKey, (current) =>
        (current ?? []).map((t) => ({
          ...t,
          subtasks: (t.subtasks ?? []).filter((s) => s.id !== subtaskId),
        })),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(tasksQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, text }: { taskId: Task['id']; text: string }) =>
      tasksApi.addComment(taskId, text),
    onSuccess: (created, { taskId }) => {
      qc.setQueryData<Task[]>(tasksQueryKey, (current) =>
        (current ?? []).map((t) =>
          t.id === taskId ? { ...t, comments: [...(t.comments ?? []), created] } : t,
        ),
      );
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId }: { commentId: TaskComment['id']; taskId: Task['id'] }) =>
      tasksApi.deleteComment(commentId),
    onMutate: async ({ commentId }) => {
      await qc.cancelQueries({ queryKey: tasksQueryKey });
      const prev = qc.getQueryData<Task[]>(tasksQueryKey);
      qc.setQueryData<Task[]>(tasksQueryKey, (current) =>
        (current ?? []).map((t) => ({
          ...t,
          comments: (t.comments ?? []).filter((c) => c.id !== commentId),
        })),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(tasksQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}
