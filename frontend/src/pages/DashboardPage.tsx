import { useTasks } from 'features/tasks/hooks/useTasks';
import { ProgressOverview } from 'features/dashboard/components/ProgressOverview';
import { SectionStats } from 'features/dashboard/components/SectionStats';
import { PriorityDistribution } from 'features/dashboard/components/PriorityDistribution';
import { computeDashboardStats } from 'features/dashboard/utils/stats';
import { Spinner } from 'shared/ui/Spinner';
import { useMemo } from 'react';

export function DashboardPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const stats = useMemo(() => computeDashboardStats(tasks), [tasks]);

  if (isLoading) return <Spinner label="Istatistikler hesaplaniyor..." />;

  return (
    <div className="flex flex-col gap-6">
      <ProgressOverview percent={stats.overallPct} />
      <div className="grid md:grid-cols-2 gap-4">
        <SectionStats sections={stats.sections} />
        <PriorityDistribution priorities={stats.priorities} total={tasks.length} />
      </div>
    </div>
  );
}
