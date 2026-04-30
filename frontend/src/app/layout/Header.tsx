import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from 'features/auth/context/AuthContext';
import { Button } from 'shared/ui/Button';
import { cn } from 'shared/lib/cn';
import { ROUTES } from '../router/routes';
import { UserMenu } from './UserMenu';

const navItems = [
  { to: ROUTES.tasks, label: 'Gorevler' },
  { to: ROUTES.kanban, label: 'Kanban' },
  { to: ROUTES.files, label: 'Dosyalar' },
  { to: ROUTES.dashboard, label: 'Dashboard' },
  { to: ROUTES.activity, label: 'Aktivite' },
] as const;

export function Header() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="pb-6 border-b border-white/5 mb-6">
      <div className="flex items-start justify-between gap-6">
        <Link to={ROUTES.tasks} className="block">
          <span className="text-[11px] tracking-[0.3em] text-muted font-medium">
            {'// OGRENME YOLCULUGU'}
          </span>
          <h1 className="font-sans text-4xl font-extrabold text-ink leading-tight">
            DevOps <span className="text-brand-bright">Roadmap</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Sifirdan uretim ortamina - her gorevi tamamla, her adimda buyu
          </p>
        </Link>
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <Button size="sm" onClick={() => navigate(ROUTES.login)}>
            Oturum Ac
          </Button>
        )}
      </div>

      <nav className="mt-5 flex gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'px-4 py-2 text-xs tracking-wider uppercase rounded-md border transition-colors',
                isActive
                  ? 'bg-brand/15 border-brand/40 text-brand-bright'
                  : 'bg-white/[0.04] border-white/10 text-muted hover:text-ink hover:border-white/25',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
