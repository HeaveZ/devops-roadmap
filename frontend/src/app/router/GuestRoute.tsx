import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'features/auth/context/AuthContext';
import { ROUTES } from './routes';

export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return null;
  if (isAuthenticated) return <Navigate to={ROUTES.tasks} replace />;
  return <>{children}</>;
}
