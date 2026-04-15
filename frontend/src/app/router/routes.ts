export const ROUTES = {
  home: '/',
  tasks: '/tasks',
  files: '/files',
  dashboard: '/dashboard',
  profile: '/profile',
  login: '/login',
  register: '/register',
  verifyCode: '/verify-code',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
