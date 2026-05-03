import { usePageTitle } from 'shared/hooks/usePageTitle';
import { VerifyCodeForm } from 'features/auth/components/VerifyCodeForm';

export function VerifyCodePage() {
  usePageTitle('Doğrulama Kodu');
  return <VerifyCodeForm />;
}
