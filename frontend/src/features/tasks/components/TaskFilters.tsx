import { cn } from 'shared/lib/cn';
import { PRIORITIES } from '../utils/priority';
import type { FilterStatus } from '../types';
import type { TaskFiltersApi } from '../hooks/useTaskFilters';

const STATUS_OPTIONS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'Tumu' },
  { key: 'active', label: 'Devam Eden' },
  { key: 'completed', label: 'Tamamlanan' },
];

export function TaskFilters({ filters }: { filters: TaskFiltersApi }) {
  const { state, setSearch, setStatus, setSection, setPriority, reset, sections, activeFilterCount, filtered } =
    filters;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <input
          type="text"
          value={state.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Gorev ara..."
          className="w-full bg-navy-800 border border-border rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-brand-bright transition-colors"
        />
        {state.search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            ✕
          </button>
        )}
      </div>

      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => setStatus(opt.key)}
          className={cn(
            'px-3 py-2 text-xs rounded-lg border transition-colors',
            state.status === opt.key
              ? 'bg-brand/15 border-brand/40 text-brand-bright'
              : 'bg-navy-800 border-border text-muted hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}

      {sections.length > 1 && (
        <select
          value={state.section}
          onChange={(e) => setSection(e.target.value)}
          className="bg-navy-800 border border-border rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-brand-bright"
        >
          <option value="all">Tum Bolumler</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      <select
        value={state.priority}
        onChange={(e) => setPriority(e.target.value)}
        className="bg-navy-800 border border-border rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-brand-bright"
      >
        <option value="all">Tum Oncelikler</option>
        {PRIORITIES.filter((p) => p.key !== 'none').map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
        <option value="none">Belirsiz</option>
      </select>

      {activeFilterCount > 0 && (
        <>
          <span className="text-xs text-muted ml-2">{filtered.length} sonuc</span>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-accent-orange hover:text-accent-orange-soft underline"
          >
            Filtreleri Temizle
          </button>
        </>
      )}
    </div>
  );
}
