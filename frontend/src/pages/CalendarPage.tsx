import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from 'shared/hooks/usePageTitle';
import { useTasks } from 'features/tasks/hooks/useTasks';
import { getPriorityInfo } from 'features/tasks/utils/priority';
import { getTaskTitle } from 'features/tasks/utils/grouping';
import { cn } from 'shared/lib/cn';
import { Spinner } from 'shared/ui/Spinner';
import type { Task } from 'features/tasks/types';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = Array.from({ length: startOffset }, () => null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function CalendarPage() {
  usePageTitle('Takvim');
  const { data: tasks = [], isLoading } = useTasks();
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const key = t.due_date.split('T')[0];
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    });
    return map;
  }, [tasks]);

  const todayKey = formatDateKey(today);

  const goPrev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  if (isLoading) return <Spinner label="Takvim yükleniyor..." />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Takvim</h2>
          <p className="text-sm text-muted mt-1">Görevlerin son tarihlerini takvimde gör</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={goPrev} className="px-3 py-1.5 bg-navy-800 border border-border/60 rounded-lg text-sm text-ink hover:bg-navy-700 transition-colors">&larr;</button>
          <span className="text-sm font-semibold text-ink min-w-[140px] text-center">{MONTH_NAMES[month]} {year}</span>
          <button type="button" onClick={goNext} className="px-3 py-1.5 bg-navy-800 border border-border/60 rounded-lg text-sm text-ink hover:bg-navy-700 transition-colors">&rarr;</button>
        </div>
      </div>

      <div className="bg-navy-800/80 border border-border/60 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-border/40">
          {DAYS.map((d) => (
            <div key={d} className="py-3 text-center text-[11px] font-semibold text-muted uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border/20 bg-navy-900/30" />;
            const key = formatDateKey(day);
            const dayTasks = tasksByDate.get(key) || [];
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[100px] p-2 border-b border-r border-border/20 transition-colors',
                  isToday && 'bg-brand/[0.05]',
                )}
              >
                <div className={cn('text-xs font-medium mb-1', isToday ? 'text-brand-bright' : 'text-muted')}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((t) => {
                    const pri = getPriorityInfo(t.priority);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => navigate(`/tasks/${t.id}`)}
                        className={cn(
                          'w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate transition-colors hover:brightness-110',
                          t.completed ? 'bg-status-green/15 text-status-green line-through' : `${pri.colorClass} bg-navy-700/50`,
                        )}
                        title={getTaskTitle(t)}
                      >
                        {getTaskTitle(t)}
                      </button>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-muted pl-1.5">+{dayTasks.length - 3} daha</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
