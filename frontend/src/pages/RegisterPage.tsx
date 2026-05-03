import { usePageTitle } from 'shared/hooks/usePageTitle';
import { RegisterForm } from 'features/auth/components/RegisterForm';

export function RegisterPage() {
  usePageTitle('Kayıt Ol');
  return <RegisterForm />;
}
