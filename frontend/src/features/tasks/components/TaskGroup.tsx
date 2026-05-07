import type { Task } from '../types';
import { TaskItem } from './TaskItem';

interface Props {
  section: string;
  tasks: Task[];
}

export function TaskGroup({ section, tasks }: Props) {
  const subtasks = tasks.flatMap((t) => t.subtasks ?? []);
  const total = tasks.length + subtasks.length;
  const done =
    tasks.filter((t) => t.completed).length +
    subtasks.filter((s) => s.completed).length;

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
          {section}
        </h3>
        <span className="text-[11px] text-muted/70">
          {done}/{total}
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </header>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}
