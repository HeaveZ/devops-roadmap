import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from 'features/tasks/hooks/useTasks';
import { getTaskTitle } from 'features/tasks/utils/grouping';
import { cn } from 'shared/lib/cn';
import { ROUTES } from 'app/router/routes';

interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  action: () => void;
  icon: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commands: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = [
      { id: 'nav-tasks', label: 'Görevler', subtitle: 'Görev listesine git', action: () => navigate(ROUTES.tasks), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2' },
      { id: 'nav-kanban', label: 'Kanban Board', subtitle: 'Kanban görünümüne git', action: () => navigate(ROUTES.kanban), icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
      { id: 'nav-dashboard', label: 'Dashboard', subtitle: 'İstatistikleri gör', action: () => navigate(ROUTES.dashboard), icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z' },
      { id: 'nav-calendar', label: 'Takvim', subtitle: 'Takvim görünümüne git', action: () => navigate('/calendar'), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'nav-sprints', label: 'Sprintler', subtitle: 'Sprint yönetimi', action: () => navigate(ROUTES.sprints), icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    ];

    const q = query.toLowerCase();
    const taskResults: CommandItem[] = q.length >= 2
      ? tasks
          .filter((t) => getTaskTitle(t).toLowerCase().includes(q))
          .slice(0, 5)
          .map((t) => ({
            id: `task-${t.id}`,
            label: getTaskTitle(t),
            subtitle: t.section || 'Görev',
            action: () => navigate(`/tasks/${t.id}`),
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
          }))
      : [];

    const filtered = nav.filter((c) => c.label.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q));
    return [...taskResults, ...filtered];
  }, [query, tasks, navigate]);

  useEffect(() => { setSelected(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, commands.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && commands[selected]) { commands[selected].action(); setOpen(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-[520px] bg-navy-800 border border-border/60 rounded-2xl shadow-card-hover overflow-hidden animate-popIn">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
          <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sayfa veya görev ara..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted/40 outline-none"
          />
          <kbd className="px-2 py-0.5 bg-navy-700 border border-border/40 rounded text-[10px] text-muted font-mono">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-2">
          {commands.length === 0 ? (
            <div className="py-8 text-center text-muted text-sm">Sonuç bulunamadı</div>
          ) : (
            commands.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => { cmd.action(); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
                  i === selected ? 'bg-brand/10 text-brand-bright' : 'text-ink-secondary hover:bg-white/[0.03]',
                )}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={cmd.icon} />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{cmd.label}</div>
                  {cmd.subtitle && <div className="text-[11px] text-muted truncate">{cmd.subtitle}</div>}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-border/40 flex items-center gap-4 text-[10px] text-muted/50">
          <span><kbd className="font-mono">↑↓</kbd> gezin</span>
          <span><kbd className="font-mono">Enter</kbd> seç</span>
          <span><kbd className="font-mono">Esc</kbd> kapat</span>
        </div>
      </div>
    </div>
  );
}
