import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from 'app/layout/AppLayout';
import { LoginPage } from 'pages/LoginPage';
import { RegisterPage } from 'pages/RegisterPage';
import { VerifyCodePage } from 'pages/VerifyCodePage';
import { TasksPage } from 'pages/TasksPage';
import { NotFoundPage } from 'pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestRoute } from './GuestRoute';
import { ROUTES } from './routes';
import { Spinner } from 'shared/ui/Spinner';

const KanbanPage = lazy(() =>
  import('pages/KanbanPage').then((m) => ({ default: m.KanbanPage })),
);
const FilesPage = lazy(() =>
  import('pages/FilesPage').then((m) => ({ default: m.FilesPage })),
);
const DashboardPage = lazy(() =>
  import('pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ActivityPage = lazy(() =>
  import('pages/ActivityPage').then((m) => ({ default: m.ActivityPage })),
);
const ProfilePage = lazy(() =>
  import('pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const TaskDetailPage = lazy(() =>
  import('pages/TaskDetailPage').then((m) => ({ default: m.TaskDetailPage })),
);
const SprintManagePage = lazy(() =>
  import('pages/SprintManagePage').then((m) => ({ default: m.SprintManagePage })),
);
const LabelManagePage = lazy(() =>
  import('pages/LabelManagePage').then((m) => ({ default: m.LabelManagePage })),
);
const CalendarPage = lazy(() =>
  import('pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: ROUTES.home, element: <Navigate to={ROUTES.tasks} replace /> },
      {
        path: ROUTES.taskDetail,
        element: (
          <ProtectedRoute>
            <Lazy>
              <TaskDetailPage />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.tasks, element: <TasksPage /> },
      {
        path: ROUTES.kanban,
        element: (
          <Lazy>
            <KanbanPage />
          </Lazy>
        ),
      },
      {
        path: ROUTES.files,
        element: (
          <ProtectedRoute>
            <Lazy>
              <FilesPage />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.dashboard,
        element: (
          <Lazy>
            <DashboardPage />
          </Lazy>
        ),
      },
      {
        path: ROUTES.activity,
        element: (
          <ProtectedRoute>
            <Lazy>
              <ActivityPage />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.sprints,
        element: (
          <ProtectedRoute>
            <Lazy>
              <SprintManagePage />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.calendar,
        element: (
          <Lazy>
            <CalendarPage />
          </Lazy>
        ),
      },
      {
        path: ROUTES.labels,
        element: (
          <ProtectedRoute>
            <Lazy>
              <LabelManagePage />
            </Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.profile,
        element: (
          <ProtectedRoute>
            <Lazy>
              <ProfilePage />
            </Lazy>
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
