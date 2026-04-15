import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'features/auth/context/AuthContext';
import { Spinner } from 'shared/ui/Spinner';
import { ROUTES } from './routes';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <Spinner label="Oturum dogrulaniyor..." />;
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
