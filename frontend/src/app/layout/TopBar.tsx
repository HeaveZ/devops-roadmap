import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'features/auth/context/AuthContext';
import { useUnreadCount } from 'features/notifications/hooks/useNotifications';
import { NotificationPanel } from 'features/notifications/components/NotificationPanel';
import { Button } from 'shared/ui/Button';
import { ROUTES } from '../router/routes';
import { UserMenu } from './UserMenu';

export function TopBar() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadCount();
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <header className="h-16 shrink-0 border-b border-border/40 bg-navy-900/60 backdrop-blur-xl px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-ink-secondary">Proje Paneli</h2>
        <kbd className="hidden md:inline-flex px-2 py-0.5 bg-navy-800 border border-border/40 rounded text-[10px] text-muted/50 font-mono">
          Ctrl+K
        </kbd>
      </div>
      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifs((s) => !s)}
              className="relative p-2 rounded-xl text-ink-secondary hover:text-ink hover:bg-white/[0.04] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
          </div>
        )}
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
