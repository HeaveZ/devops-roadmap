import { ProgressBar } from 'features/tasks/components/ProgressBar';
import type { SectionStat } from '../utils/stats';

export function SectionStats({ sections }: { sections: SectionStat[] }) {
  return (
    <div className="bg-navy-800 border border-border rounded-xl p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
        Bölüm İlerleme
      </div>
      <div className="flex flex-col gap-3">
        {sections.map((s) => (
          <div key={s.name} className="grid grid-cols-[100px_1fr_auto] items-center gap-3">
            <span className="text-xs text-ink truncate" title={s.name}>
              {s.name}
            </span>
            <ProgressBar percent={s.pct} />
            <span className="text-[11px] text-muted font-mono">
              {s.done}/{s.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
