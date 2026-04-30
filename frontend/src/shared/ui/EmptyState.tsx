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
        'text-muted/50 text-sm py-16 text-center border border-dashed border-border/40 rounded-2xl bg-navy-800/30',
        className,
      )}
    >
      {children}
    </div>
  );
}
