import { ProgressBar } from 'features/tasks/components/ProgressBar';

interface Props {
  percent: number;
}

export function ProgressOverview({ percent }: Props) {
  return (
    <div className="bg-navy-800 border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
          Genel Ilerleme
        </span>
        <span className="text-lg font-extrabold text-brand-bright">{percent}%</span>
      </div>
      <ProgressBar percent={percent} />
    </div>
  );
}
