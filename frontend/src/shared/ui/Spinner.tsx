import { cn } from '../lib/cn';

interface SpinnerProps {
  label?: string;
  className?: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-ink-secondary text-sm', className)}>
      <div className="w-10 h-10 border-2 border-border/40 border-t-brand rounded-full animate-spin" />
      {label && <span className="font-medium">{label}</span>}
    </div>
  );
}
