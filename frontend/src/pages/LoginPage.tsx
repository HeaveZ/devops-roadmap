import { usePageTitle } from 'shared/hooks/usePageTitle';
import { LoginForm } from 'features/auth/components/LoginForm';

export function LoginPage() {
  usePageTitle('Giriş Yap');
  return <LoginForm />;
}
