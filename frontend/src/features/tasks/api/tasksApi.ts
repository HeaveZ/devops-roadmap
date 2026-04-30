import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type { Subtask, Task, TaskComment } from '../types';

export const tasksApi = {
  list: () => apiClient.get<Task[]>(endpoints.tasks.list).then((r) => r.data),

  create: (title: string, section: string) =>
    apiClient
      .post<Task>(endpoints.tasks.list, { title, section })
      .then((r) => r.data),

  update: (id: number | string, patch: Partial<Pick<Task, 'completed' | 'priority'>>) =>
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
};
