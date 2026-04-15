import { useMemo } from 'react';
import { EmptyState } from 'shared/ui/EmptyState';
import { groupBySection } from '../utils/grouping';
import type { Task } from '../types';
import { TaskGroup } from './TaskGroup';

interface Props {
  tasks: Task[];
}

export function TaskList({ tasks }: Props) {
  const grouped = useMemo(() => groupBySection(tasks), [tasks]);
  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    return <EmptyState>{'// Bu filtrede gorev bulunamadi'}</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-6">
      {entries.map(([section, sectionTasks]) => (
        <TaskGroup key={section} section={section} tasks={sectionTasks} />
      ))}
    </div>
  );
}
