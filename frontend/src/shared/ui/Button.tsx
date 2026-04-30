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
    'bg-brand-gradient hover:bg-brand-gradient-hover text-white font-semibold shadow-sm hover:shadow-brand',
  secondary:
    'bg-navy-700/60 hover:bg-navy-700 border border-border/60 text-ink',
  ghost:
    'bg-transparent hover:bg-white/[0.06] border border-transparent text-ink-secondary hover:text-ink',
  danger:
    'bg-status-red/10 hover:bg-status-red/20 border border-status-red/30 text-status-red',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-sm rounded-xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block = false, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-sans transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900',
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
