import { getSection } from 'features/tasks/utils/grouping';
import type { PriorityKey, Task } from 'features/tasks/types';

export interface SectionStat {
  name: string;
  total: number;
  done: number;
  pct: number;
}

export interface PriorityStat {
  key: PriorityKey;
  label: string;
  hex: string;
  count: number;
}

export interface DashboardStats {
  overallPct: number;
  totalItems: number;
  doneItems: number;
  sections: SectionStat[];
  priorities: PriorityStat[];
}

const PRIORITY_ORDER: Array<{ key: PriorityKey; label: string; hex: string }> = [
  { key: 'kritik', label: 'Kritik', hex: '#EF5350' },
  { key: 'yuksek', label: 'Yuksek', hex: '#FF8C00' },
  { key: 'orta', label: 'Orta', hex: '#FFD54F' },
  { key: 'dusuk', label: 'Dusuk', hex: '#64B5F6' },
  { key: 'none', label: 'Belirsiz', hex: '#7B9BBF' },
];

export function computeDashboardStats(tasks: Task[]): DashboardStats {
  const subtasks = tasks.flatMap((t) => t.subtasks ?? []);
  const totalItems = tasks.length + subtasks.length;
  const doneItems =
    tasks.filter((t) => t.completed).length +
    subtasks.filter((s) => s.completed).length;
  const overallPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const sectionMap = new Map<string, { total: number; done: number }>();
  for (const task of tasks) {
    const key = getSection(task);
    const entry = sectionMap.get(key) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (task.completed) entry.done += 1;
    sectionMap.set(key, entry);
  }

  const sections: SectionStat[] = Array.from(sectionMap.entries()).map(
    ([name, { total, done }]) => ({
      name,
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    }),
  );

  const priorities: PriorityStat[] = PRIORITY_ORDER.map((p) => ({
    ...p,
    count: tasks.filter((t) =>
      p.key === 'none'
        ? !t.priority || t.priority === 'none'
        : t.priority === p.key,
    ).length,
  }));

  return { overallPct, totalItems, doneItems, sections, priorities };
}
