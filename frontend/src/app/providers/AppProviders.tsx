import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from 'features/auth/context/AuthContext';
import { ToastProvider } from 'shared/ui/Toast';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
