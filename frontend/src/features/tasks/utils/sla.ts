import type { Task, PriorityKey } from '../types';

export type SlaStatus = 'on_track' | 'warning' | 'overdue' | 'none';

const SLA_HOURS: Record<string, number> = {
  acil: 4,
  kritik: 24,
  yuksek: 48,
  orta: 72,
  dusuk: 168,
  none: 0,
};

export function getSlaStatus(task: Task): SlaStatus {
  if (task.completed || task.status === 'done') return 'none';
  if (!task.due_date) return 'none';

  const now = Date.now();
  const due = new Date(task.due_date).getTime();
  const hoursLeft = (due - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return 'overdue';

  const slaHours = SLA_HOURS[task.priority ?? 'none'] || 0;
  if (slaHours > 0 && hoursLeft < slaHours * 0.25) return 'warning';
  if (hoursLeft < 24) return 'warning';

  return 'on_track';
}

export function getSlaLabel(status: SlaStatus): string {
  switch (status) {
    case 'overdue': return 'SLA Asildi';
    case 'warning': return 'SLA Yaklasti';
    case 'on_track': return 'SLA OK';
    default: return '';
  }
}

export function getOverdueDays(task: Task): number {
  if (!task.due_date) return 0;
  const now = Date.now();
  const due = new Date(task.due_date).getTime();
  const diff = now - due;
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

export function getTaskCode(task: Task): string {
  return `TSK-${task.id}`;
}
