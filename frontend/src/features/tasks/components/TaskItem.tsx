import { useState } from 'react';
import { cn } from 'shared/lib/cn';
import { useAuth } from 'features/auth/context/AuthContext';
import { useGuestTrack } from 'features/analytics/hooks/useGuestTrack';
import { useUpdateTask } from '../hooks/useTaskMutations';
import { getNextPriority } from '../utils/priority';
import { getTaskTitle } from '../utils/grouping';
import type { PriorityKey, Task } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { LevelBadge } from './LevelBadge';
import { SubtaskList } from './SubtaskList';
import { CommentList } from './CommentList';

interface Props {
  task: Task;
}

export function TaskItem({ task }: Props) {
  const { isAuthenticated } = useAuth();
  const track = useGuestTrack();
  const update = useUpdateTask();

  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const subtasks = task.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.completed).length;
  const commentCount = (task.comments ?? []).length;

  const toggleCompleted = () => {
    if (!isAuthenticated) {
      track('CLICK_TASK', getTaskTitle(task));
      return;
    }
    update.mutate({ id: task.id, patch: { completed: !task.completed } });
  };

  const cyclePriority = () => {
    if (!isAuthenticated) {
      track('CLICK_PRIORITY', getTaskTitle(task));
      return;
    }
    const next = getNextPriority(task.priority);
    update.mutate({ id: task.id, patch: { priority: next as PriorityKey } });
  };

  return (
    <div className="group">
      <div
        className={cn(
          'flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-colors',
          task.completed
            ? 'bg-white/[0.03] border-white/5 opacity-70'
            : 'bg-navy-800 border-border hover:border-white/20',
        )}
      >
        <button
          type="button"
          onClick={toggleCompleted}
          disabled={!isAuthenticated}
          className={cn(
            'w-5 h-5 shrink-0 rounded border flex items-center justify-center text-[10px] transition-colors',
            task.completed
              ? 'bg-brand border-brand text-ink'
              : 'border-border hover:border-brand-bright',
            !isAuthenticated && 'cursor-not-allowed opacity-50',
          )}
        >
          {task.completed && '✓'}
        </button>

        <span
          className={cn(
            'flex-1 text-sm',
            task.completed ? 'line-through text-muted' : 'text-ink',
          )}
        >
          {getTaskTitle(task)}
        </span>

        {subtasks.length > 0 && (
          <span className="text-[10px] text-muted px-2 py-0.5 rounded-full bg-white/5">
            {subDone}/{subtasks.length}
          </span>
        )}

        <PriorityBadge
          value={task.priority ?? 'none'}
          onClick={cyclePriority}
          disabled={!isAuthenticated}
          title={isAuthenticated ? 'Oncelik degistir' : 'Giris yapin'}
        />
        <LevelBadge level={task.level ?? task.difficulty} />

        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className={cn(
            'relative w-8 h-8 rounded-md border flex items-center justify-center transition-colors',
            showComments
              ? 'bg-brand/15 border-brand/40 text-brand-bright'
              : 'bg-white/5 border-white/10 text-muted hover:text-ink',
          )}
          title="Yorumlar"
        >
          💬
          {commentCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand text-ink text-[9px] px-1 rounded-full">
              {commentCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className={cn(
            'w-8 h-8 rounded-md border flex items-center justify-center transition-colors',
            expanded
              ? 'bg-brand/15 border-brand/40 text-brand-bright'
              : 'bg-white/5 border-white/10 text-muted hover:text-ink',
          )}
          title={expanded ? 'Kapat' : 'Alt gorevler'}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && <SubtaskList task={task} />}
      {showComments && <CommentList task={task} />}
    </div>
  );
}
