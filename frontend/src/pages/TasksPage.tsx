import { useMemo, useState } from 'react';
import { useAuth } from 'features/auth/context/AuthContext';
import { useTasks } from 'features/tasks/hooks/useTasks';
import { useTaskFilters } from 'features/tasks/hooks/useTaskFilters';
import { TaskFilters } from 'features/tasks/components/TaskFilters';
import { TaskList } from 'features/tasks/components/TaskList';
import { CreateTaskForm } from 'features/tasks/components/CreateTaskForm';
import { ProgressOverview } from 'features/dashboard/components/ProgressOverview';
import { Spinner } from 'shared/ui/Spinner';
import { Button } from 'shared/ui/Button';

export function TasksPage() {
  const { isAuthenticated } = useAuth();
  const { data: tasks = [], isLoading, error } = useTasks();
  const filters = useTaskFilters(tasks);
  const [showCreate, setShowCreate] = useState(false);

  const stats = useMemo(() => {
    const allSubtasks = tasks.flatMap((t) => t.subtasks ?? []);
    const total = tasks.length + allSubtasks.length;
    const done =
      tasks.filter((t) => t.completed).length +
      allSubtasks.filter((s) => s.completed).length;
    return {
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      taskTotal: tasks.length,
      taskDone: tasks.filter((t) => t.completed).length,
    };
  }, [tasks]);

  if (isLoading) return <Spinner label="Backend'e baglaniliyor..." />;
  if (error) {
    return (
      <div className="p-6 rounded-xl border border-status-red/40 bg-status-red/10 text-status-red text-center">
        Backend'e baglanamadi. Lutfen tekrar deneyin.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Pill label="TOPLAM" value={stats.taskTotal} />
        <Pill label="TAMAMLANDI" value={stats.taskDone} accent="orange" />
        <Pill label="KALAN" value={stats.taskTotal - stats.taskDone} accent="red" />
        {isAuthenticated && (
          <Button
            size="sm"
            onClick={() => setShowCreate((s) => !s)}
            className="ml-auto shrink-0"
          >
            {showCreate ? 'Kapat' : '+ Yeni Gorev'}
          </Button>
        )}
      </div>

      {showCreate && <CreateTaskForm onClose={() => setShowCreate(false)} />}

      <ProgressOverview percent={stats.pct} />

      <TaskFilters filters={filters} />

      <TaskList tasks={filters.filtered} />
    </div>
  );
}

function Pill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'orange' | 'red';
}) {
  const color =
    accent === 'orange'
      ? 'text-accent-orange'
      : accent === 'red'
        ? 'text-status-red'
        : 'text-ink';
  return (
    <div className="flex-1 rounded-xl border border-border bg-navy-800 px-4 py-3 text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] tracking-widest text-muted mt-1">{label}</div>
    </div>
  );
}
