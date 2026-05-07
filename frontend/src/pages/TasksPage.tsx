import { useMemo, useState } from 'react';
import { usePageTitle } from 'shared/hooks/usePageTitle';
import { useAuth } from 'features/auth/context/AuthContext';
import { useTasks } from 'features/tasks/hooks/useTasks';
import { useTaskFilters } from 'features/tasks/hooks/useTaskFilters';
import { TaskFilters } from 'features/tasks/components/TaskFilters';
import { TaskList } from 'features/tasks/components/TaskList';
import { CreateTaskForm } from 'features/tasks/components/CreateTaskForm';
import { ProgressOverview } from 'features/dashboard/components/ProgressOverview';
import { TaskPageSkeleton } from 'shared/ui/Skeleton';
import { Button } from 'shared/ui/Button';
import { exportTasksCSV } from 'features/tasks/utils/export';

export function TasksPage() {
  usePageTitle('Gorevler');
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
    const overdue = tasks.filter(
      (t) => !t.completed && t.due_date && new Date(t.due_date).getTime() < Date.now(),
    ).length;
    return {
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      taskTotal: tasks.length,
      taskDone: tasks.filter((t) => t.completed).length,
      overdue,
    };
  }, [tasks]);

  if (isLoading) return <TaskPageSkeleton />;
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
        <Pill label="TAMAMLANDI" value={stats.taskDone} accent="green" />
        <Pill label="KALAN" value={stats.taskTotal - stats.taskDone} accent="orange" />
        {stats.overdue > 0 && <Pill label="GECIKEN" value={stats.overdue} accent="red" />}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => exportTasksCSV(filters.filtered)}
            className="px-3 py-2 text-xs text-muted hover:text-ink border border-border rounded-lg hover:bg-white/[0.04] transition-colors"
            title="CSV olarak indir"
          >
            <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>
          {isAuthenticated && (
            <Button
              size="sm"
              onClick={() => setShowCreate((s) => !s)}
            >
              {showCreate ? 'Kapat' : '+ Yeni Gorev'}
            </Button>
          )}
        </div>
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
  accent?: 'green' | 'orange' | 'red';
}) {
  const colorMap = { green: 'text-status-green', orange: 'text-accent-orange', red: 'text-status-red' };
  const color = accent ? colorMap[accent] : 'text-ink';
  return (
    <div className="flex-1 rounded-xl border border-border bg-navy-800 px-4 py-3 text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] tracking-widest text-muted mt-1">{label}</div>
    </div>
  );
}
