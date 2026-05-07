import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full bg-navy-900/80 border rounded-xl px-4 py-3 text-sm font-sans text-ink outline-none transition-all duration-200',
        'placeholder:text-muted/70',
        'focus:ring-1 focus:ring-brand/20',
        invalid
          ? 'border-status-red/60 focus:border-status-red'
          : 'border-border/60 focus:border-brand/50',
        className,
      )}
      {...rest}
    />
  );
});
