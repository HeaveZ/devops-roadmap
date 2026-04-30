export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    verifyCode: '/auth/verify-code',
    verify: '/auth/verify',
  },
  tasks: {
    list: '/api/tasks',
    detail: (id: number | string) => `/api/tasks/${id}`,
    update: (id: number | string) => `/api/tasks/${id}`,
    subtasks: (taskId: number | string) => `/api/tasks/${taskId}/subtasks`,
    subtask: (subtaskId: number | string) => `/api/subtasks/${subtaskId}`,
    comments: (taskId: number | string) => `/api/tasks/${taskId}/comments`,
    comment: (commentId: number | string) => `/api/comments/${commentId}`,
    addLabel: (taskId: number | string) => `/api/tasks/${taskId}/labels`,
    removeLabel: (taskId: number | string, labelId: number | string) => `/api/tasks/${taskId}/labels/${labelId}`,
  },
  labels: {
    list: '/api/labels',
    delete: (id: number | string) => `/api/labels/${id}`,
  },
  sprints: {
    list: '/api/sprints',
    update: (id: number | string) => `/api/sprints/${id}`,
    delete: (id: number | string) => `/api/sprints/${id}`,
  },
  files: {
    list: '/api/files',
    upload: '/api/upload',
    delete: (id: number | string) => `/api/files/${id}`,
  },
  profile: {
    avatar: '/api/avatar',
    changePassword: '/api/change-password',
  },
  analytics: {
    track: '/api/track',
  },
  auditLogs: {
    list: (limit = 50, offset = 0) => `/api/audit-logs?limit=${limit}&offset=${offset}`,
  },
} as const;
