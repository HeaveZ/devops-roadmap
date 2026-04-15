import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from 'app/layout/AppLayout';
import { LoginPage } from 'pages/LoginPage';
import { RegisterPage } from 'pages/RegisterPage';
import { VerifyCodePage } from 'pages/VerifyCodePage';
import { TasksPage } from 'pages/TasksPage';
import { FilesPage } from 'pages/FilesPage';
import { DashboardPage } from 'pages/DashboardPage';
import { ProfilePage } from 'pages/ProfilePage';
import { NotFoundPage } from 'pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestRoute } from './GuestRoute';
import { ROUTES } from './routes';

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: ROUTES.home, element: <Navigate to={ROUTES.tasks} replace /> },
      { path: ROUTES.tasks, element: <TasksPage /> },
      {
        path: ROUTES.files,
        element: (
          <ProtectedRoute>
            <FilesPage />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      {
        path: ROUTES.profile,
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.login,
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        ),
      },
      {
        path: ROUTES.register,
        element: (
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        ),
      },
      {
        path: ROUTES.verifyCode,
        element: (
          <GuestRoute>
            <VerifyCodePage />
          </GuestRoute>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
