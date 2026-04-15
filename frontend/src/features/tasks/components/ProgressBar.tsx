import { cn } from 'shared/lib/cn';

interface Props {
  percent: number;
  className?: string;
  fillClassName?: string;
  minVisible?: number;
}

export function ProgressBar({
  percent,
  className,
  fillClassName,
  minVisible = 2,
}: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const visible = clamped > 0 ? Math.max(clamped, minVisible) : 0;
  return (
    <div className={cn('h-2 rounded-full bg-white/5 overflow-hidden', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 bg-brand-gradient',
          fillClassName,
        )}
        style={{ width: `${visible}%` }}
      />
    </div>
  );
}
