import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTasks } from 'features/tasks/hooks/useTasks';
import { useSprints } from 'features/tasks/hooks/useSprints';
import type { Sprint } from 'features/tasks/types';

interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

function buildBurndownData(sprint: Sprint, totalTasks: number, completedByDate: Map<string, number>): BurndownPoint[] {
  if (!sprint.start_date || !sprint.end_date) return [];
  const start = new Date(sprint.start_date);
  const end = new Date(sprint.end_date);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (totalDays <= 0) return [];

  const points: BurndownPoint[] = [];
  let cumulativeCompleted = 0;

  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = `${d.getDate()}.${d.getMonth() + 1}`;

    cumulativeCompleted += completedByDate.get(dateStr) || 0;
    const ideal = Math.max(0, totalTasks - (totalTasks / totalDays) * i);
    const actual = Math.max(0, totalTasks - cumulativeCompleted);

    points.push({ date: dayLabel, ideal: Math.round(ideal * 10) / 10, actual });
  }
  return points;
}

export function BurndownChart() {
  const { data: tasks = [] } = useTasks();
  const { data: sprints = [] } = useSprints();

  const activeSprint = useMemo(
    () => sprints.find((s) => s.status === 'active'),
    [sprints],
  );

  const data = useMemo(() => {
    if (!activeSprint) return [];
    const sprintTasks = tasks.filter((t) => t.sprint_id === activeSprint.id);
    const completedByDate = new Map<string, number>();
    sprintTasks.forEach((t) => {
      if (t.completed && t.due_date) {
        const d = t.due_date.split('T')[0];
        completedByDate.set(d, (completedByDate.get(d) || 0) + 1);
      }
    });
    return buildBurndownData(activeSprint, sprintTasks.length, completedByDate);
  }, [tasks, activeSprint]);

  if (!activeSprint) {
    return (
      <div className="bg-navy-800/80 border border-border/60 rounded-2xl p-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Burndown Chart</div>
        <div className="py-12 text-center text-muted text-sm">Aktif sprint yok</div>
      </div>
    );
  }

  return (
    <div className="bg-navy-800/80 border border-border/60 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">Burndown Chart</div>
        <span className="text-xs text-brand-bright font-medium">{activeSprint.name}</span>
      </div>
      <div className="h-64">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">Tarih bilgisi eksik</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: '#ffffff',
                }}
              />
              <Line type="monotone" dataKey="ideal" stroke="#4f46e5" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Ideal" />
              <Line type="monotone" dataKey="actual" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: '#818cf8', r: 3 }} name="Gercek" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
