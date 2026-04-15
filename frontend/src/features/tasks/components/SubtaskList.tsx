import { useState } from 'react';
import { cn } from 'shared/lib/cn';
import { useAuth } from 'features/auth/context/AuthContext';
import {
  useAddSubtask,
  useDeleteSubtask,
  useToggleSubtask,
} from '../hooks/useTaskMutations';
import type { Subtask, Task } from '../types';
import { SubtaskForm } from './SubtaskForm';

interface Props {
  task: Task;
}

export function SubtaskList({ task }: Props) {
  const { isAuthenticated } = useAuth();
  const toggle = useToggleSubtask();
  const del = useDeleteSubtask();
  const add = useAddSubtask();
  const [showForm, setShowForm] = useState(false);

  const subtasks = task.subtasks ?? [];

  return (
    <div className="pl-6 mt-2 flex flex-col gap-1">
      {subtasks.map((st: Subtask) => (
        <div
          key={st.id}
          className={cn(
            'flex items-center gap-3 py-2 px-3 rounded-md bg-white/[0.02] border border-white/5',
            st.completed && 'opacity-60',
          )}
        >
          <button
            type="button"
            onClick={() =>
              isAuthenticated &&
              toggle.mutate({ subtask: st, completed: !st.completed })
            }
            disabled={!isAuthenticated}
            className={cn(
              'w-5 h-5 rounded border flex items-center justify-center text-[10px] transition-colors',
              st.completed
                ? 'bg-brand border-brand text-ink'
                : 'border-border hover:border-brand-bright',
              !isAuthenticated && 'cursor-not-allowed opacity-50',
            )}
          >
            {st.completed && '✓'}
          </button>
          <span
            className={cn(
              'flex-1 text-sm',
              st.completed ? 'line-through text-muted' : 'text-ink',
            )}
          >
            {st.title}
          </span>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => del.mutate({ subtaskId: st.id, taskId: task.id })}
              title="Sil"
              className="text-muted hover:text-status-red text-sm w-6 h-6"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {isAuthenticated &&
        (showForm ? (
          <SubtaskForm
            onCreate={(title) => {
              add.mutate({ taskId: task.id, title });
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs text-brand hover:text-brand-bright w-max mt-1"
          >
            + Alt gorev ekle
          </button>
        ))}
    </div>
  );
}
