import type { Task } from '../types';
import { getTaskTitle } from './grouping';
import { getTaskCode } from './sla';

export function exportTasksCSV(tasks: Task[]) {
  const headers = ['Kod', 'Baslik', 'Durum', 'Oncelik', 'Bolum', 'Atanan', 'Bitis Tarihi', 'Tamamlandi'];
  const rows = tasks.map((t) => [
    getTaskCode(t),
    getTaskTitle(t),
    t.status || (t.completed ? 'done' : 'todo'),
    t.priority || 'none',
    t.section || t.category || '',
    t.assignee_email || '',
    t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : '',
    t.completed ? 'Evet' : 'Hayir',
  ]);

  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskly-gorevler-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
