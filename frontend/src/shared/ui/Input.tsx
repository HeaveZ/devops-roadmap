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
        'w-full bg-navy-700 border-2 rounded-lg px-4 py-3.5 text-[15px] font-sans text-ink outline-none transition-all duration-200',
        'placeholder:text-muted/50',
        'focus:shadow-glow',
        invalid
          ? 'border-status-red focus:border-status-red'
          : 'border-border focus:border-brand-bright',
        className,
      )}
      {...rest}
    />
  );
});
