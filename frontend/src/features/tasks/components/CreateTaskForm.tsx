import { useState, useMemo } from 'react';
import { cn } from 'shared/lib/cn';
import { Button } from 'shared/ui/Button';
import { useToast } from 'shared/ui/Toast';
import { useTasks } from '../hooks/useTasks';
import { useCreateTask } from '../hooks/useCreateTask';
import { getSection } from '../utils/grouping';

export function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('');
  const { data: tasks = [] } = useTasks();
  const createTask = useCreateTask();
  const toast = useToast();

  const existingSections = useMemo(
    () => [...new Set(tasks.map((t) => getSection(t)))],
    [tasks],
  );

  const handleSubmit = () => {
    if (!title.trim()) return;
    createTask.mutate(
      { title: title.trim(), section: section.trim() || 'Genel' },
      {
        onSuccess: () => {
          toast.success('Gorev olusturuldu');
          onClose();
        },
        onError: () => toast.error('Gorev olusturulamadi'),
      },
    );
  };

  return (
    <div className="bg-navy-800 border border-border rounded-xl p-5 mb-5 animate-fadeIn">
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Gorev basligi..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-4 py-2.5 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-brand/50"
          autoFocus
        />
        <div className="flex gap-3">
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
          >
            <option value="">Bolum sec veya yeni yaz...</option>
            {existingSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="veya yeni bolum..."
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className={cn(
              'flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-brand/50',
            )}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Iptal
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || createTask.isPending}
          >
            {createTask.isPending ? 'Olusturuluyor...' : 'Olustur'}
          </Button>
        </div>
      </div>
    </div>
  );
}
