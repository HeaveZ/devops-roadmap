import type { Task } from '../types';

export function getSection(task: Task): string {
  return task.section ?? task.category ?? 'Genel';
}

export function groupBySection(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = getSection(task);
    (acc[key] ??= []).push(task);
    return acc;
  }, {});
}

export function getTaskTitle(task: Task): string {
  return task.title ?? task.name ?? '';
}
