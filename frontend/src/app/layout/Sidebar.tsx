import { NavLink, Link } from 'react-router-dom';
import { cn } from 'shared/lib/cn';
import { useAuth } from 'features/auth/context/AuthContext';
import { useUnreadCount } from 'features/notifications/hooks/useNotifications';
import { ROUTES } from '../router/routes';

const navSections = [
  {
    title: 'Ana Menü',
    items: [
      { to: ROUTES.tasks, label: 'Görevler', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { to: ROUTES.kanban, label: 'Kanban Board', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { to: ROUTES.calendar, label: 'Takvim', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { to: ROUTES.dashboard, label: 'Dashboard', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      { to: ROUTES.sprints, label: 'Sprintler', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { to: ROUTES.labels, label: 'Etiketler', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
      { to: ROUTES.activity, label: 'Aktivite', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
  {
    title: 'Diğer',
    items: [
      { to: ROUTES.files, label: 'Dosyalar', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
      { to: ROUTES.profile, label: 'Profil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    ],
  },
];

function NavIcon({ path }: { path: string }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function NotificationBadge() {
  const { isAuthenticated } = useAuth();
  const { data: count = 0 } = useUnreadCount();

  if (!isAuthenticated || count === 0) return null;

  return (
    <span className="ml-auto bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Sidebar() {
  return (
    <aside className="w-[260px] shrink-0 bg-navy-900 border-r border-border/60 flex flex-col shadow-sidebar">
      {/* Logo */}
      <Link to={ROUTES.tasks} className="px-6 py-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <img src="/taskly-192.png" alt="Taskly" className="w-9 h-9 rounded-xl object-cover" />
          <div>
            <h1 className="text-base font-bold text-ink leading-tight">Taskly</h1>
            <p className="text-[11px] text-muted">Proje Yönetimi</p>
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            <div className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-muted/80">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand/10 text-brand-bright shadow-sm'
                        : 'text-ink-secondary hover:text-ink hover:bg-white/[0.04]',
                    )
                  }
                >
                  <NavIcon path={item.icon} />
                  {item.label}
                  {item.label === 'Aktivite' && <NotificationBadge />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Keyboard shortcut hint */}
      <div className="px-4 py-3 border-t border-border/40">
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted/40">
          <kbd className="px-1.5 py-0.5 bg-navy-800 border border-border/40 rounded text-[9px] font-mono">Ctrl+K</kbd>
          <span>Hızlı arama</span>
        </div>
      </div>
    </aside>
  );
}
