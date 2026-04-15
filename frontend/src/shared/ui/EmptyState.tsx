import { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface EmptyStateProps {
  children: ReactNode;
  className?: string;
}

export function EmptyState({ children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-muted/60 italic text-sm py-10 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]',
        className,
      )}
    >
      {children}
    </div>
  );
}
