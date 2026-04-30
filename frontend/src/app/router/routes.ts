export const ROUTES = {
  home: '/',
  tasks: '/tasks',
  taskDetail: '/tasks/:id',
  kanban: '/kanban',
  files: '/files',
  dashboard: '/dashboard',
  activity: '/activity',
  sprints: '/sprints',
  labels: '/labels',
  profile: '/profile',
  login: '/login',
  register: '/register',
  verifyCode: '/verify-code',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
