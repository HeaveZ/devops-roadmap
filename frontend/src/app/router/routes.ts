export const ROUTES = {
  home: '/',
  tasks: '/tasks',
  kanban: '/kanban',
  files: '/files',
  dashboard: '/dashboard',
  activity: '/activity',
  profile: '/profile',
  login: '/login',
  register: '/register',
  verifyCode: '/verify-code',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
