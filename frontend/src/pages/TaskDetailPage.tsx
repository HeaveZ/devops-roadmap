import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from 'shared/hooks/usePageTitle';
import { useTaskDetail } from 'features/tasks/hooks/useTaskDetail';
import { useUpdateTask } from 'features/tasks/hooks/useTaskMutations';
import { useLabels } from 'features/tasks/hooks/useLabels';
import { useSprints } from 'features/tasks/hooks/useSprints';
import { useAddTaskLabel, useRemoveTaskLabel } from 'features/tasks/hooks/useLabelMutations';
import { SubtaskList } from 'features/tasks/components/SubtaskList';
import { CommentList } from 'features/tasks/components/CommentList';
import { getPriorityInfo, PRIORITIES } from 'features/tasks/utils/priority';
import { getTaskCode, getSlaStatus, getSlaLabel } from 'features/tasks/utils/sla';
import { useToast } from 'shared/ui/Toast';
import { Spinner } from 'shared/ui/Spinner';
import { Button } from 'shared/ui/Button';
import { cn } from 'shared/lib/cn';
import { useAuth } from 'features/auth/context/AuthContext';
import { ROUTES } from 'app/router/routes';
import { formatFullDate } from 'shared/lib/date';
import type { TaskStatus } from 'features/tasks/types';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Yapılacak' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'in_review', label: 'İncelemede' },
  { value: 'done', label: 'Tamamlandı' },
];

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const { data: task, isLoading, error } = useTaskDetail(id!);
  usePageTitle(task ? (task.title ?? task.name ?? 'Görev Detayı') : 'Görev Detayı');
  const updateTask = useUpdateTask();
  const { data: allLabels = [] } = useLabels();
  const { data: sprints = [] } = useSprints();
  const addLabel = useAddTaskLabel();
  const removeLabel = useRemoveTaskLabel();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  useEffect(() => {
    if (task) {
      setTitleValue(task.title ?? task.name ?? '');
      setDescValue(task.description ?? '');
    }
  }, [task]);

  if (isLoading) return <Spinner label="Görev yükleniyor..." />;
  if (error || !task) {
    return (
      <div className="p-6 rounded-xl border border-status-red/40 bg-status-red/10 text-status-red text-center">
        Görev bulunamadı.
        <div className="mt-3">
          <Button size="sm" variant="ghost" onClick={() => navigate(ROUTES.tasks)}>
            Görevlere Dön
          </Button>
        </div>
      </div>
    );
  }

  const currentStatus: TaskStatus = task.status || (task.completed ? 'done' : 'todo');
  const taskLabels = task.labels ?? [];
  const availableLabels = allLabels.filter((l) => !taskLabels.some((tl) => tl.id === l.id));
  const pri = getPriorityInfo(task.priority);

  const handleUpdate = (patch: Record<string, unknown>) => {
    updateTask.mutate(
      { id: task.id, patch },
      { onSuccess: () => toast.success('Güncellendi') },
    );
  };

  const handleSaveTitle = () => {
    if (!titleValue.trim()) return;
    handleUpdate({ title: titleValue.trim() });
    setEditingTitle(false);
  };

  const handleSaveDesc = () => {
    handleUpdate({ description: descValue });
    setEditingDesc(false);
  };

  const handleStatusChange = (status: string) => {
    const completed = status === 'done';
    handleUpdate({ status, completed });
  };

  const renderTitleSection = () => {
    if (editingTitle && isAuthenticated) {
      return (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            className="w-full px-4 py-2.5 bg-navy-900 border border-border rounded-lg text-lg font-bold text-ink focus:outline-none focus:border-brand/50"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>İptal</Button>
            <Button size="sm" onClick={handleSaveTitle}>Kaydet</Button>
          </div>
        </div>
      );
    }
    if (isAuthenticated) {
      const sla = getSlaStatus(task);
      return (
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-brand-bright/60 bg-brand/10 px-2 py-1 rounded">{getTaskCode(task)}</span>
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="text-2xl font-extrabold text-ink cursor-pointer hover:text-brand-bright transition-colors text-left"
            title="Duzenlemek icin tiklayin"
          >
            {task.title ?? task.name ?? 'Basliksiz Gorev'}
          </button>
          {sla === 'overdue' && (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-status-red/15 text-status-red border border-status-red/30">GECIKTI</span>
          )}
          {sla === 'warning' && (
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-status-amber/15 text-status-amber border border-status-amber/30">SLA</span>
          )}
        </div>
      );
    }
    return (
      <h1 className="text-2xl font-extrabold text-ink">
        {task.title ?? task.name ?? 'Başlıksız Görev'}
      </h1>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(ROUTES.tasks)}
        className="text-sm text-muted hover:text-ink transition-colors w-max flex items-center gap-1"
      >
        <span>&larr;</span> Görevlere Dön
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Ana içerik */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Başlık */}
          <div className="bg-navy-800 border border-border rounded-xl p-5">
            {renderTitleSection()}
          </div>

          {/* Açıklama */}
          <div className="bg-navy-800 border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs tracking-widest text-muted uppercase">Açıklama</h3>
              {!editingDesc && isAuthenticated && (
                <button
                  type="button"
                  onClick={() => { setDescValue(task.description || ''); setEditingDesc(true); }}
                  className="text-xs text-brand-bright hover:underline"
                >
                  Düzenle
                </button>
              )}
            </div>
            {editingDesc && isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink resize-y focus:outline-none focus:border-brand/50"
                  placeholder="Açıklama ekleyin..."
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>İptal</Button>
                  <Button size="sm" onClick={handleSaveDesc}>Kaydet</Button>
                </div>
              </div>
            ) : (
              <p className={cn(
                'text-sm text-ink whitespace-pre-wrap min-h-[40px]',
                !task.description && 'text-muted/50 italic',
              )}>
                {task.description || 'Açıklama eklenmemiş. Eklemek için Düzenle butonuna tıklayın.'}
              </p>
            )}
          </div>

          {/* Alt görevler */}
          <div className="bg-navy-800 border border-border rounded-xl p-5">
            <h3 className="text-xs tracking-widest text-muted uppercase mb-3">Alt Görevler</h3>
            <SubtaskList task={task} />
          </div>

          {/* Yorumlar */}
          <div className="bg-navy-800 border border-border rounded-xl p-5">
            <CommentList task={task} />
          </div>
        </div>

        {/* Sağ: Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Durum */}
          <SidebarCard label="Durum">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => isAuthenticated && handleStatusChange(opt.value)}
                  disabled={!isAuthenticated}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-md border transition-colors',
                    currentStatus === opt.value
                      ? 'bg-brand/15 border-brand/40 text-brand-bright'
                      : 'border-border text-muted hover:text-ink hover:border-white/25',
                    !isAuthenticated && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SidebarCard>

          {/* Öncelik */}
          <SidebarCard label="Öncelik">
            <select
              value={task.priority || 'none'}
              onChange={(e) => handleUpdate({ priority: e.target.value })}
              disabled={!isAuthenticated}
              className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {PRIORITIES.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            {pri.key !== 'none' && (
              <div className={cn('mt-2 text-xs px-2 py-1 rounded-md border w-max', pri.colorClass)}>
                {pri.label}
              </div>
            )}
          </SidebarCard>

          {/* Atanan Kişi */}
          <SidebarCard label="Atanan Kişi">
            <input
              type="email"
              placeholder="email@ornek.com"
              defaultValue={task.assignee_email || ''}
              onBlur={(e) => handleUpdate({ assignee_email: e.target.value || null })}
              disabled={!isAuthenticated}
              className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/70 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </SidebarCard>

          {/* Bitiş Tarihi */}
          <SidebarCard label="Bitiş Tarihi">
            <input
              type="date"
              defaultValue={task.due_date?.split('T')[0] || ''}
              onChange={(e) => handleUpdate({ due_date: e.target.value || null })}
              disabled={!isAuthenticated}
              className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {task.due_date && (
              <div className="mt-2 text-xs text-muted">
                {formatFullDate(task.due_date)}
              </div>
            )}
          </SidebarCard>

          {/* Sprint */}
          <SidebarCard label="Sprint">
            <select
              value={task.sprint_id ?? ''}
              onChange={(e) => handleUpdate({ sprint_id: e.target.value ? Number(e.target.value) : null })}
              disabled={!isAuthenticated}
              className="w-full px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Sprint seçilmedi</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </SidebarCard>

          {/* Etiketler */}
          <SidebarCard label="Etiketler">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {taskLabels.length === 0 && (
                <span className="text-xs text-muted/50 italic">Etiket yok</span>
              )}
              {taskLabels.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border text-ink"
                  style={{ borderColor: l.color, backgroundColor: l.color + '20' }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.name}
                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => removeLabel.mutate({ taskId: task.id, labelId: l.id })}
                      className="ml-0.5 text-muted hover:text-status-red"
                    >
                      x
                    </button>
                  )}
                </span>
              ))}
            </div>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className="text-xs text-brand hover:text-brand-bright transition-colors mb-2"
              >
                {showLabelPicker ? 'Kapat' : '+ Etiket Ekle'}
              </button>
            )}
            {showLabelPicker && availableLabels.length > 0 && (
              <div className="mt-1 pt-2 border-t border-white/5 flex flex-col gap-1 max-h-40 overflow-y-auto">
                {availableLabels.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => addLabel.mutate({ taskId: task.id, labelId: l.id })}
                    className="flex items-center gap-2 text-xs text-ink hover:bg-white/5 px-2 py-1.5 rounded-md transition-colors text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full inline-block border border-white/10"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.name}
                  </button>
                ))}
              </div>
            )}
            {showLabelPicker && availableLabels.length === 0 && (
              <span className="text-xs text-muted/50 italic">Eklenecek etiket kalmadı</span>
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
