import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from 'shared/lib/cn';
import { useAuth } from 'features/auth/context/AuthContext';
import { useGuestTrack } from 'features/analytics/hooks/useGuestTrack';
import { useToast } from 'shared/ui/Toast';
import { Modal } from 'shared/ui/Modal';
import { Button } from 'shared/ui/Button';
import { useUpdateTask, useDeleteTask } from '../hooks/useTaskMutations';
import { getNextPriority } from '../utils/priority';
import { getTaskTitle } from '../utils/grouping';
import { getTaskCode, getSlaStatus } from '../utils/sla';
import type { PriorityKey, Task, TaskStatus } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { LevelBadge } from './LevelBadge';
import { SubtaskList } from './SubtaskList';
import { CommentList } from './CommentList';

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'Yapılacak', color: 'text-muted' },
  { value: 'in_progress', label: 'Devam Ediyor', color: 'text-accent-orange' },
  { value: 'in_review', label: 'İncelemede', color: 'text-purple-400' },
  { value: 'done', label: 'Tamamlandı', color: 'text-status-green' },
];

interface Props {
  task: Task;
}

export function TaskItem({ task }: Props) {
  const { isAuthenticated } = useAuth();
  const track = useGuestTrack();
  const update = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toast = useToast();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const subtasks = task.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.completed).length;
  const commentCount = (task.comments ?? []).length;
  const currentStatus = task.status || (task.completed ? 'done' : 'todo');

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

  const handleStatusChange = (status: TaskStatus) => {
    update.mutate({ id: task.id, patch: { status } });
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast.success('Görev silindi');
        setShowDeleteConfirm(false);
      },
    });
  };

  const statusInfo = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];
  const sla = getSlaStatus(task);
  const isOverdue = sla === 'overdue';
  const isWarning = sla === 'warning';

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

        <button
          type="button"
          onClick={() => navigate(`/tasks/${task.id}`)}
          className={cn(
            'flex-1 text-sm text-left hover:text-brand-bright transition-colors flex items-center gap-2',
            task.completed ? 'line-through text-muted' : 'text-ink',
          )}
        >
          <span className="text-[10px] text-brand-bright/60 font-mono shrink-0">{getTaskCode(task)}</span>
          <span className="truncate">{getTaskTitle(task)}</span>
          {isOverdue && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-status-red/15 text-status-red border border-status-red/30">
              GECIKTI
            </span>
          )}
          {isWarning && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-status-amber/15 text-status-amber border border-status-amber/30">
              SLA
            </span>
          )}
        </button>

        {subtasks.length > 0 && (
          <span className="text-[11px] text-muted px-2 py-0.5 rounded-full bg-white/5">
            {subDone}/{subtasks.length}
          </span>
        )}

        <PriorityBadge
          value={task.priority ?? 'none'}
          onClick={cyclePriority}
          disabled={!isAuthenticated}
          title={isAuthenticated ? 'Öncelik değiştir' : 'Giriş yapın'}
        />
        <LevelBadge level={task.level ?? task.difficulty} />

        {/* Status dropdown */}
        {isAuthenticated && (
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className={cn(
              'px-2 py-1 text-[11px] font-medium rounded-md border border-border/60 bg-navy-900/80 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 cursor-pointer appearance-none',
              statusInfo.color,
            )}
            title="Durum değiştir"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

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
            <span className="absolute -top-1 -right-1 bg-brand text-ink text-[10px] px-1 rounded-full">
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
          title={expanded ? 'Kapat' : 'Alt görevler'}
        >
          {expanded ? '−' : '+'}
        </button>

        {/* Silme butonu */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-8 h-8 rounded-md border border-transparent flex items-center justify-center text-muted/60 hover:text-status-red hover:border-status-red/30 hover:bg-status-red/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Görevi sil"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {expanded && <SubtaskList task={task} />}
      {showComments && <CommentList task={task} />}

      {/* Silme onay modal */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-status-red/15 flex items-center justify-center">
            <svg className="w-6 h-6 text-status-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-ink">Görevi Sil</h3>
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{getTaskTitle(task)}</span> görevini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex gap-3 mt-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1"
            >
              İptal
            </Button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-status-red/15 border border-status-red/40 text-status-red hover:bg-status-red/25 transition-colors disabled:opacity-50"
            >
              {deleteTask.isPending ? 'Siliniyor...' : 'Evet, Sil'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
