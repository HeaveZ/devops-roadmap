import { cn } from '../lib/cn';

interface SpinnerProps {
  label?: string;
  className?: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-8 text-muted text-sm', className)}>
      <div className="w-8 h-8 border-2 border-border border-t-brand-bright rounded-full animate-spin" />
      {label && <span>{label}</span>}
    </div>
  );
}
