import { useState } from 'react';
import { cn } from 'shared/lib/cn';
import { formatRelativeDate } from 'shared/lib/date';
import { Spinner } from 'shared/ui/Spinner';
import { EmptyState } from 'shared/ui/EmptyState';
import { Button } from 'shared/ui/Button';
import { useActivity } from '../hooks/useActivity';
import type { AuditLog } from '../types';

const PAGE_SIZE = 30;

const ACTION_META: Record<string, { icon: string; label: string; color: string }> = {
  TASK_COMPLETED: { icon: '✓', label: 'Gorev tamamlandi', color: 'text-status-green' },
  TASK_UNCOMPLETED: { icon: '↩', label: 'Gorev yeniden acildi', color: 'text-accent-orange' },
  TASK_CREATED: { icon: '+', label: 'Gorev olusturuldu', color: 'text-brand-bright' },
  TASK_UPDATED: { icon: '✎', label: 'Gorev guncellendi', color: 'text-brand-bright' },
  TASK_STATUS_CHANGED: { icon: '⟳', label: 'Gorev durumu degisti', color: 'text-accent-orange' },
  TASK_PRIORITY_CHANGED: { icon: '◆', label: 'Oncelik degisti', color: 'text-priority-yuksek' },
  TASK_ASSIGNED: { icon: '→', label: 'Gorev atandi', color: 'text-brand-bright' },
  TASK_LABEL_ADDED: { icon: '🏷', label: 'Etiket eklendi', color: 'text-brand-bright' },
  TASK_LABEL_REMOVED: { icon: '🏷', label: 'Etiket kaldirildi', color: 'text-muted' },
  TASKS_REORDERED: { icon: '↕', label: 'Gorevler yeniden siralandi', color: 'text-muted' },
  SUBTASK_CREATED: { icon: '＋', label: 'Alt gorev eklendi', color: 'text-brand-bright' },
  SUBTASK_COMPLETED: { icon: '✓', label: 'Alt gorev tamamlandi', color: 'text-status-green' },
  SUBTASK_UNCOMPLETED: { icon: '↩', label: 'Alt gorev acildi', color: 'text-accent-orange' },
  SUBTASK_DELETED: { icon: '✕', label: 'Alt gorev silindi', color: 'text-status-red' },
  COMMENT_CREATED: { icon: '💬', label: 'Yorum eklendi', color: 'text-brand-bright' },
  COMMENT_DELETED: { icon: '✕', label: 'Yorum silindi', color: 'text-status-red' },
  LABEL_CREATED: { icon: '🏷', label: 'Etiket olusturuldu', color: 'text-brand-bright' },
  LABEL_DELETED: { icon: '✕', label: 'Etiket silindi', color: 'text-status-red' },
  SPRINT_CREATED: { icon: '⚡', label: 'Sprint olusturuldu', color: 'text-brand-bright' },
  SPRINT_UPDATED: { icon: '⚡', label: 'Sprint guncellendi', color: 'text-accent-orange' },
  SPRINT_DELETED: { icon: '✕', label: 'Sprint silindi', color: 'text-status-red' },
  FILE_UPLOADED: { icon: '↑', label: 'Dosya yuklendi', color: 'text-brand-bright' },
  FILE_DELETED: { icon: '✕', label: 'Dosya silindi', color: 'text-status-red' },
  USER_LOGIN: { icon: '→', label: 'Giris yapildi', color: 'text-status-green' },
  USER_REGISTERED: { icon: '★', label: 'Kayit olundu', color: 'text-brand-bright' },
  PASSWORD_CHANGED: { icon: '🔑', label: 'Sifre degistirildi', color: 'text-accent-orange' },
  AVATAR_UPDATED: { icon: '📷', label: 'Avatar guncellendi', color: 'text-brand-bright' },
};

function getActionMeta(action: string) {
  if (action.startsWith('GUEST_')) {
    return { icon: '👁', label: 'Misafir etkilesim', color: 'text-muted' };
  }
  return ACTION_META[action] ?? { icon: '•', label: action, color: 'text-muted' };
}

function LogItem({ log }: { log: AuditLog }) {
  const meta = getActionMeta(log.action);

  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-lg bg-navy-800 border border-border hover:border-white/15 transition-colors">
      <span
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 bg-white/5 border border-white/10',
          meta.color,
        )}
      >
        {meta.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-ink">{meta.label}</span>
          <span className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">
            {log.resource}
          </span>
        </div>
        {log.details && (
          <p className="text-xs text-muted truncate">{log.details}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {log.email && (
            <span className="text-[11px] text-brand-bright">{log.email}</span>
          )}
          <span className="text-[11px] text-muted">
            {formatRelativeDate(log.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useActivity(PAGE_SIZE, offset);

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const hasMore = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  if (isLoading && logs.length === 0) {
    return <Spinner label="Aktivite yukleniyor..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Aktivite Logu</h2>
          <p className="text-sm text-muted mt-1">
            Tum islemler ve degisiklikler — {total} kayit
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState>Henuz aktivite kaydedilmemis</EmptyState>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
        </div>
      )}

      {(hasPrev || hasMore) && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasPrev}
            onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
          >
            Onceki
          </Button>
          <span className="text-xs text-muted">
            {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} / {total}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasMore}
            onClick={() => setOffset((p) => p + PAGE_SIZE)}
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}
