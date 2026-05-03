import type { PriorityStat } from '../utils/stats';

interface Props {
  priorities: PriorityStat[];
  total: number;
}

export function PriorityDistribution({ priorities, total }: Props) {
  return (
    <div className="bg-navy-800 border border-border rounded-xl p-5">
      <div className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
        Öncelik Dağılımı
      </div>
      <div className="flex flex-col gap-2">
        {priorities.map((p) => {
          const ratio = total > 0 ? (p.count / total) * 100 : 0;
          const width = p.count > 0 ? Math.max(ratio, 4) : 0;
          return (
            <div
              key={p.key}
              className="grid grid-cols-[10px_70px_1fr_auto] items-center gap-3"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: p.hex }}
              />
              <span className="text-xs text-ink">{p.label}</span>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${width}%`, background: p.hex }}
                />
              </div>
              <span className="text-[11px] text-muted font-mono w-6 text-right">
                {p.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
