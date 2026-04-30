import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskDetail } from 'features/tasks/hooks/useTaskDetail';
import { useUpdateTask } from 'features/tasks/hooks/useTaskMutations';
import { useLabels } from 'features/tasks/hooks/useLabels';
import { useSprints } from 'features/tasks/hooks/useSprints';
import { useAddTaskLabel, useRemoveTaskLabel } from 'features/tasks/hooks/useLabelMutations';
import { SubtaskList } from 'features/tasks/components/SubtaskList';
import { CommentList } from 'features/tasks/components/CommentList';
import { getPriorityInfo, PRIORITIES } from 'features/tasks/utils/priority';
import { useToast } from 'shared/ui/Toast';
import { Spinner } from 'shared/ui/Spinner';
import { Button } from 'shared/ui/Button';
import { cn } from 'shared/lib/cn';
import { useAuth } from 'features/auth/context/AuthContext';
import { ROUTES } from 'app/router/routes';
import { formatFullDate } from 'shared/lib/date';
import type { TaskStatus } from 'features/tasks/types';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Yapilacak' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'in_review', label: 'Incelemede' },
  { value: 'done', label: 'Tamamlandi' },
];

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTaskDetail(id!);
  const updateTask = useUpdateTask();
  const { data: allLabels = [] } = useLabels();
  const { data: sprints = [] } = useSprints();
  const addLabel = useAddTaskLabel();
  const removeLabel = useRemoveTaskLabel();
  const toast = useToast();

  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState('');

  if (isLoading) return <Spinner label="Gorev yukleniyor..." />;
  if (!task) return <div className="text-center text-muted py-20">Gorev bulunamadi</div>;

  const taskLabels = task.labels ?? [];
  const availableLabels = allLabels.filter((l) => !taskLabels.some((tl) => tl.id === l.id));

  const handleUpdate = (patch: Record<string, unknown>) => {
    updateTask.mutate(
      { id: task.id, patch },
      { onSuccess: () => toast.success('Guncellendi') },
    );
  };

  const handleDescSave = () => {
    handleUpdate({ description: desc });
    setEditingDesc(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-muted hover:text-ink transition-colors self-start"
      >
        &larr; Geri
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Ana icerik */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <h1 className="text-2xl font-extrabold text-ink">{task.title ?? task.name}</h1>

          {/* Aciklama */}
          <div className="bg-navy-800 border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs tracking-widest text-muted uppercase">Aciklama</h3>
              {!editingDesc && (
                <button
                  onClick={() => { setDesc(task.description || ''); setEditingDesc(true); }}
                  className="text-xs text-brand-bright hover:underline"
                >
                  Duzenle
                </button>
              )}
            </div>
            {editingDesc ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink resize-none focus:outline-none focus:border-brand/50"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>Iptal</Button>
                  <Button size="sm" onClick={handleDescSave}>Kaydet</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink whitespace-pre-wrap">
                {task.description || 'Aciklama eklenmemis'}
              </p>
            )}
          </div>

          {/* Alt gorevler */}
          <div className="bg-navy-800 border border-border rounded-xl p-5">
            <h3 className="text-xs tracking-widest text-muted uppercase mb-3">Alt Gorevler</h3>
            <SubtaskList task={task} />
          </div>

          {/* Yorumlar */}
          <div className="bg-navy-800 border border-border rounded-xl p-5">
            <h3 className="text-xs tracking-widest text-muted uppercase mb-3">Yorumlar</h3>
            <CommentList task={task} />
          </div>
        </div>

        {/* Sag: Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Durum */}
          <SidebarCard label="Durum">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleUpdate({ status: opt.value })}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-md border transition-colors',
                    (task.status || 'todo') === opt.value
                      ? 'bg-brand/15 border-brand/40 text-brand-bright'
                      : 'border-border text-muted hover:text-ink hover:border-white/25',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SidebarCard>

          {/* Oncelik */}
          <SidebarCard label="Oncelik">
            <select
              value={task.priority || 'none'}
              onChange={(e) => handleUpdate({ priority: e.target.value })}
              className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </SidebarCard>

          {/* Atanan */}
          <SidebarCard label="Atanan">
            <input
              type="email"
              placeholder="email@example.com"
              defaultValue={task.assignee_email || ''}
              onBlur={(e) => handleUpdate({ assignee_email: e.target.value || null })}
              className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-brand/50"
            />
          </SidebarCard>

          {/* Son Tarih */}
          <SidebarCard label="Son Tarih">
            <input
              type="date"
              defaultValue={task.due_date?.split('T')[0] || ''}
              onChange={(e) => handleUpdate({ due_date: e.target.value || null })}
              className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
            />
          </SidebarCard>

          {/* Sprint */}
          <SidebarCard label="Sprint">
            <select
              value={task.sprint_id ?? ''}
              onChange={(e) => handleUpdate({ sprint_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
            >
              <option value="">Sprint yok</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </SidebarCard>

          {/* Etiketler */}
          <SidebarCard label="Etiketler">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {taskLabels.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border text-ink"
                  style={{ borderColor: l.color, backgroundColor: l.color + '20' }}
                >
                  {l.name}
                  <button
                    onClick={() => removeLabel.mutate({ taskId: task.id, labelId: l.id })}
                    className="text-muted hover:text-ink ml-0.5"
                  >
                    x
                  </button>
                </span>
              ))}
              {taskLabels.length === 0 && <span className="text-xs text-muted">Etiket yok</span>}
            </div>
            {availableLabels.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    addLabel.mutate({ taskId: task.id, labelId: Number(e.target.value) });
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-xs text-ink focus:outline-none focus:border-brand/50"
              >
                <option value="">Etiket ekle...</option>
                {availableLabels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
          </SidebarCard>
        </div>
      </div>
    </div>
  );
}

function SidebarCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-800 border border-border rounded-xl p-4">
      <h4 className="text-[10px] tracking-widest text-muted uppercase mb-2">{label}</h4>
      {children}
    </div>
  );
}
