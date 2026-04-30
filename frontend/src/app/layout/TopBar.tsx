import { useNavigate } from 'react-router-dom';
import { useAuth } from 'features/auth/context/AuthContext';
import { Button } from 'shared/ui/Button';
import { ROUTES } from '../router/routes';
import { UserMenu } from './UserMenu';

export function TopBar() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 shrink-0 border-b border-border/40 bg-navy-900/60 backdrop-blur-xl px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-ink-secondary">Proje Paneli</h2>
      </div>
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <Button size="sm" onClick={() => navigate(ROUTES.login)}>
            Oturum Ac
          </Button>
        )}
      </div>
    </header>
  );
}
