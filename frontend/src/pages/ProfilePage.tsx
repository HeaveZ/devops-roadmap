import { usePageTitle } from 'shared/hooks/usePageTitle';
import { ProfilePanel } from 'features/profile/components/ProfilePanel';

export function ProfilePage() {
  usePageTitle('Profil');
  return <ProfilePanel />;
}
