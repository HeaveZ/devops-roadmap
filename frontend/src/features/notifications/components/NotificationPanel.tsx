import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { useMarkRead, useMarkAllRead } from '../hooks/useNotificationMutations';
import { cn } from 'shared/lib/cn';
import { formatRelativeDate } from 'shared/lib/date';
import type { Notification } from 'features/tasks/types';

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  COMMENT_ADDED: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  TASK_STATUS_CHANGED: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
};

function NotifIcon({ type }: { type: string }) {
  const path = TYPE_ICONS[type] || 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
  return (
    <svg className="w-5 h-5 shrink-0 text-brand-bright" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const navigate = useNavigate();

  const handleClick = (notif: Notification) => {
    if (!notif.read) markRead.mutate(notif.id);
    if (notif.resource === 'task' && notif.resource_id) {
      navigate(`/tasks/${notif.resource_id}`);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-[380px] bg-navy-800 border border-border/60 rounded-2xl shadow-card-hover overflow-hidden z-50 animate-popIn">
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Bildirimler</h3>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="text-xs text-brand-bright hover:underline"
          >
            Tümünü okundu işaretle
          </button>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-muted text-sm">Bildirim yok</div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={cn(
                'w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]',
                !n.read && 'bg-brand/[0.04]',
              )}
            >
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', n.read ? 'text-ink-secondary' : 'text-ink font-medium')}>
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-xs text-muted mt-0.5 truncate">{n.message}</p>
                )}
                <p className="text-[11px] text-muted/80 mt-1">{formatRelativeDate(n.created_at)}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-brand-bright shrink-0 mt-2" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
