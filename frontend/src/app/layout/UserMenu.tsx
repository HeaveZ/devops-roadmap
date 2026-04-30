import { useNavigate } from 'react-router-dom';
import { useAuth } from 'features/auth/context/AuthContext';
import { Avatar } from 'shared/ui/Avatar';
import { Dropdown } from 'shared/ui/Dropdown';
import { ROUTES } from '../router/routes';

function UserMenuTrigger({ open, toggle, email, avatarData }: { open: boolean; toggle: () => void; email: string; avatarData: string | null }) {
  const displayName = email.includes('@') ? email.split('@')[0] : email;
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-800 border border-border hover:border-brand transition-colors"
    >
      <Avatar src={avatarData} name={email} size="sm" />
      <span className="text-sm text-ink">{displayName}</span>
      <span className="text-xs text-muted">{open ? '▲' : '▼'}</span>
    </button>
  );
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Dropdown
      items={[
        {
          key: 'profile',
          label: 'Profilim',
          icon: <span>👤</span>,
          onSelect: () => navigate(ROUTES.profile),
        },
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <span>📊</span>,
          onSelect: () => navigate(ROUTES.dashboard),
        },
        {
          key: 'logout',
          label: 'Cikis Yap',
          icon: <span>↗</span>,
          danger: true,
          onSelect: () => {
            logout();
            navigate(ROUTES.login);
          },
        },
      ]}
      trigger={({ open, toggle }) => (
        <UserMenuTrigger open={open} toggle={toggle} email={user.email} avatarData={user.avatarData ?? null} />
      )}
    />
  );
}
