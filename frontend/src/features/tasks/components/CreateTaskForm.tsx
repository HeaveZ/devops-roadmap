import { useState, useMemo } from 'react';
import { cn } from 'shared/lib/cn';
import { Button } from 'shared/ui/Button';
import { useToast } from 'shared/ui/Toast';
import { useTasks } from '../hooks/useTasks';
import { useCreateTask } from '../hooks/useCreateTask';
import { useSprints } from '../hooks/useSprints';
import { getSection } from '../utils/grouping';
import { PRIORITIES } from '../utils/priority';
import { getTemplates, type TaskTemplate } from '../utils/templates';

export function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('none');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sprintId, setSprintId] = useState('');
  const { data: tasks = [] } = useTasks();
  const { data: sprints = [] } = useSprints();
  const createTask = useCreateTask();
  const toast = useToast();

  const templates = getTemplates();

  const applyTemplate = (tpl: TaskTemplate) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setPriority(tpl.priority);
    if (tpl.section) setSection(tpl.section);
  };

  const existingSections = useMemo(
    () => [...new Set(tasks.map((t) => getSection(t)))],
    [tasks],
  );

  const handleSubmit = () => {
    if (!title.trim()) return;
    createTask.mutate(
      {
        title: title.trim(),
        section: section.trim() || 'Genel',
        description: description.trim() || undefined,
        priority: priority !== 'none' ? priority : undefined,
        assignee_email: assignee.trim() || undefined,
        due_date: dueDate || undefined,
        sprint_id: sprintId ? Number(sprintId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Görev oluşturuldu');
          onClose();
        },
        onError: () => toast.error('Görev oluşturulamadı'),
      },
    );
  };

  return (
    <div className="bg-navy-800 border border-border rounded-xl p-5 mb-5 animate-fadeIn">
      <div className="flex flex-col gap-3">
        {/* Template selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted uppercase tracking-wider">Sablon:</span>
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="px-2.5 py-1 text-[11px] rounded-md border border-border/60 text-muted hover:text-ink hover:border-brand/40 hover:bg-brand/10 transition-colors"
            >
              {tpl.name}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Gorev basligi..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-4 py-2.5 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-brand/50"
          autoFocus
        />
        <textarea
          placeholder="Açıklama (isteğe bağlı)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-brand/50 resize-y"
        />
        <div className="flex gap-3">
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
          >
            <option value="">Bölüm seç veya yeni yaz...</option>
            {existingSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="veya yeni bölüm..."
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className={cn(
              'flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-brand/50',
            )}
          />
        </div>
        <div className="flex gap-3">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
          >
            {PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <select
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
          >
            <option value="">Sprint seçilmedi</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="Atanan kişi (email)..."
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/50 focus:outline-none focus:border-brand/50"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            İptal
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || createTask.isPending}
          >
            {createTask.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
          </Button>
        </div>
      </div>
    </div>
  );
}
