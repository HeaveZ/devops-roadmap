import { useState } from 'react';
import { usePageTitle } from 'shared/hooks/usePageTitle';
import { useSprints } from 'features/tasks/hooks/useSprints';
import { useCreateSprint, useUpdateSprint, useDeleteSprint } from 'features/tasks/hooks/useSprintMutations';
import { useTasks } from 'features/tasks/hooks/useTasks';
import { Button } from 'shared/ui/Button';
import { useToast } from 'shared/ui/Toast';
import { Spinner } from 'shared/ui/Spinner';
import { cn } from 'shared/lib/cn';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planlama', color: 'text-muted' },
  active: { label: 'Aktif', color: 'text-accent-orange' },
  completed: { label: 'Tamamlandı', color: 'text-status-green' },
};

export function SprintManagePage() {
  usePageTitle('Sprint Yönetimi');
  const { data: sprints = [], isLoading } = useSprints();
  const { data: tasks = [] } = useTasks();
  const createSprint = useCreateSprint();
  const updateSprint = useUpdateSprint();
  const deleteSprint = useDeleteSprint();
  const toast = useToast();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    createSprint.mutate(
      { name: name.trim(), start_date: startDate || undefined, end_date: endDate || undefined },
      {
        onSuccess: () => { toast.success('Sprint oluşturuldu'); setName(''); setStartDate(''); setEndDate(''); },
        onError: () => toast.error('Sprint oluşturulamadı'),
      },
    );
  };

  const taskCountForSprint = (sprintId: number) =>
    tasks.filter((t) => t.sprint_id === sprintId).length;

  if (isLoading) return <Spinner label="Sprintler yükleniyor..." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Sprint Yönetimi</h2>
        <p className="text-sm text-muted mt-1">Sprintleri oluştur, düzenle ve yönet</p>
      </div>

      {/* Oluşturma formu */}
      <div className="bg-navy-800 border border-border rounded-xl p-5">
        <h3 className="text-xs tracking-widest text-muted uppercase mb-3">Yeni Sprint</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Sprint adı..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 min-w-[200px] px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-brand/50"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
          />
          <Button size="sm" onClick={handleCreate} disabled={!name.trim() || createSprint.isPending}>
            Oluştur
          </Button>
        </div>
      </div>

      {/* Sprint listesi */}
      <div className="flex flex-col gap-3">
        {sprints.map((sprint) => {
          const info = STATUS_LABELS[sprint.status] || STATUS_LABELS.planning;
          const count = taskCountForSprint(sprint.id);
          return (
            <div key={sprint.id} className="bg-navy-800 border border-border rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold text-ink">{sprint.name}</h4>
                  <span className={cn('text-[11px] font-medium', info.color)}>{info.label}</span>
                  <span className="text-[11px] text-muted bg-white/5 px-2 py-0.5 rounded-full">
                    {count} görev
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">
                  {sprint.start_date?.split('T')[0] || '?'} &mdash; {sprint.end_date?.split('T')[0] || '?'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {sprint.status === 'planning' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateSprint.mutate({ id: sprint.id, data: { status: 'active' } })}
                  >
                    Başlat
                  </Button>
                )}
                {sprint.status === 'active' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateSprint.mutate({ id: sprint.id, data: { status: 'completed' } })}
                  >
                    Tamamla
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    deleteSprint.mutate(sprint.id, {
                      onSuccess: () => toast.success('Sprint silindi'),
                    });
                  }}
                  className="text-status-red hover:text-status-red"
                >
                  Sil
                </Button>
              </div>
            </div>
          );
        })}
        {sprints.length === 0 && (
          <div className="text-center text-muted py-10">Henüz sprint oluşturulmamış</div>
        )}
      </div>
    </div>
  );
}
