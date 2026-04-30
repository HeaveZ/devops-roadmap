import { useTasks } from 'features/tasks/hooks/useTasks';
import { ProgressOverview } from 'features/dashboard/components/ProgressOverview';
import { SectionStats } from 'features/dashboard/components/SectionStats';
import { PriorityDistribution } from 'features/dashboard/components/PriorityDistribution';
import { CompletionChart } from 'features/dashboard/components/CompletionChart';
import { SectionChart } from 'features/dashboard/components/SectionChart';
import { PriorityChart } from 'features/dashboard/components/PriorityChart';
import { computeDashboardStats } from 'features/dashboard/utils/stats';
import { Spinner } from 'shared/ui/Spinner';
import { useMemo } from 'react';

export function DashboardPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const stats = useMemo(() => computeDashboardStats(tasks), [tasks]);

  if (isLoading) return <Spinner label="Istatistikler hesaplaniyor..." />;

  return (
    <div className="flex flex-col gap-6">
      {/* Ozet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Toplam" value={tasks.length} />
        <StatCard label="Tamamlanan" value={stats.doneItems} color="text-brand-bright" />
        <StatCard label="Kalan" value={stats.totalItems - stats.doneItems} color="text-status-red" />
        <StatCard label="Ilerleme" value={`${stats.overallPct}%`} color="text-status-green" />
      </div>

      <ProgressOverview percent={stats.overallPct} />

      {/* Grafikler */}
      <div className="grid md:grid-cols-2 gap-4">
        <CompletionChart stats={stats} />
        <PriorityChart priorities={stats.priorities} />
      </div>

      <SectionChart sections={stats.sections} />

      {/* Mevcut detay kartlari */}
      <div className="grid md:grid-cols-2 gap-4">
        <SectionStats sections={stats.sections} />
        <PriorityDistribution priorities={stats.priorities} total={tasks.length} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'text-ink',
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-navy-800 border border-border rounded-xl px-4 py-4 text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] tracking-widest text-muted mt-1 uppercase">{label}</div>
    </div>
  );
}
