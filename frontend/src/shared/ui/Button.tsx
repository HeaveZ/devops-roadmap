import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-brand-gradient hover:bg-brand-gradient-hover text-ink font-bold tracking-wider shadow-none hover:shadow-brand',
  secondary:
    'bg-navy-700 hover:bg-navy-700/80 border border-border text-ink',
  ghost:
    'bg-transparent hover:bg-white/5 border border-transparent text-muted hover:text-ink',
  danger:
    'bg-status-red/15 hover:bg-status-red/25 border border-status-red/40 text-status-red',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-5 py-3.5 text-sm rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block = false, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-sans transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        variantStyles[variant],
        sizeStyles[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
