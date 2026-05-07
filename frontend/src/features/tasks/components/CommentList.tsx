import { Link } from 'react-router-dom';
import { Avatar } from 'shared/ui/Avatar';
import { formatFullDate } from 'shared/lib/date';
import { useAuth } from 'features/auth/context/AuthContext';
import { useGuestTrack } from 'features/analytics/hooks/useGuestTrack';
import { ROUTES } from 'app/router/routes';
import { useAddComment, useDeleteComment } from '../hooks/useTaskMutations';
import type { Task, TaskComment } from '../types';
import { CommentForm } from './CommentForm';

interface Props {
  task: Task;
}

export function CommentList({ task }: Props) {
  const { isAuthenticated, user } = useAuth();
  const track = useGuestTrack();
  const add = useAddComment();
  const del = useDeleteComment();

  const comments = task.comments ?? [];

  return (
    <div className="mt-3 bg-navy-800/50 border border-border rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-muted mb-3">Yorumlar</div>

      {comments.length === 0 && (
        <div className="text-xs text-muted italic mb-3">Henuz yorum yok</div>
      )}

      <div className="flex flex-col gap-3">
        {comments.map((c: TaskComment) => (
          <div key={c.id} className="flex flex-col gap-1 pb-2 border-b border-white/5 last:border-0 last:pb-0">
            <div className="flex items-center gap-2">
              <Avatar
                src={c.author === user?.email ? user?.avatarData ?? null : null}
                name={c.author}
                size="sm"
              />
              <span className="text-xs font-semibold text-ink">{c.author || 'Anonim'}</span>
              <span className="text-[11px] text-muted ml-auto">
                {formatFullDate(c.created_at)}
              </span>
              {isAuthenticated && c.author === user?.email && (
                <button
                  type="button"
                  onClick={() => del.mutate({ commentId: c.id, taskId: task.id })}
                  className="text-muted hover:text-status-red text-sm w-7 h-7 flex items-center justify-center rounded hover:bg-status-red/10"
                  title="Sil"
                >
                  ×
                </button>
              )}
            </div>
            <div className="text-sm text-ink pl-8">{c.text}</div>
          </div>
        ))}
      </div>

      {isAuthenticated ? (
        <CommentForm onSubmit={(text) => add.mutate({ taskId: task.id, text })} />
      ) : (
        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-muted">
          Yorum yazmak icin{' '}
          <Link
            to={ROUTES.login}
            onClick={() => track('CLICK_LOGIN_PROMPT', 'Yorum alanindan')}
            className="text-brand-bright hover:underline"
          >
            giris yapin
          </Link>
        </div>
      )}
    </div>
  );
}
