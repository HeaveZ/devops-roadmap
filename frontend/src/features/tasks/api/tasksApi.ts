import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type { Subtask, Task, TaskComment } from '../types';

export interface CreateTaskPayload {
  title: string;
  section: string;
  description?: string;
  priority?: string;
  assignee_email?: string;
  due_date?: string;
  sprint_id?: number;
}

export type UpdateTaskPatch = Partial<
  Pick<Task, 'completed' | 'priority' | 'description' | 'status' | 'assignee_email' | 'due_date' | 'sprint_id'>
>;

export const tasksApi = {
  list: () => apiClient.get<Task[]>(endpoints.tasks.list).then((r) => r.data),

  detail: (id: number | string) =>
    apiClient.get<Task>(endpoints.tasks.detail(id)).then((r) => r.data),

  create: (payload: CreateTaskPayload) =>
    apiClient.post<Task>(endpoints.tasks.list, payload).then((r) => r.data),

  update: (id: number | string, patch: UpdateTaskPatch) =>
    apiClient.patch<Task>(endpoints.tasks.update(id), patch).then((r) => r.data),

  addSubtask: (taskId: number | string, title: string) =>
    apiClient
      .post<Subtask>(endpoints.tasks.subtasks(taskId), { title })
      .then((r) => r.data),

  toggleSubtask: (subtaskId: number | string, completed: boolean) =>
    apiClient
      .patch<Subtask>(endpoints.tasks.subtask(subtaskId), { completed })
      .then((r) => r.data),

  deleteSubtask: (subtaskId: number | string) =>
    apiClient.delete(endpoints.tasks.subtask(subtaskId)).then(() => undefined),

  addComment: (taskId: number | string, text: string) =>
    apiClient
      .post<TaskComment>(endpoints.tasks.comments(taskId), { text })
      .then((r) => r.data),

  deleteComment: (commentId: number | string) =>
    apiClient.delete(endpoints.tasks.comment(commentId)).then(() => undefined),

  addLabel: (taskId: number | string, labelId: number) =>
    apiClient.post(endpoints.tasks.addLabel(taskId), { labelId }).then((r) => r.data),

  removeLabel: (taskId: number | string, labelId: number | string) =>
    apiClient.delete(endpoints.tasks.removeLabel(taskId, labelId)).then(() => undefined),

  reorder: (taskIds: (number | string)[]) =>
    apiClient.post(endpoints.tasks.reorder, { taskIds }).then((r) => r.data),

  deleteTask: (id: number | string) =>
    apiClient.delete(endpoints.tasks.detail(id)).then(() => undefined),
};
