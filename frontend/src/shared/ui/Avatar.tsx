import { cn } from '../lib/cn';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-14 h-14 text-lg',
} as const;

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initial = (name ?? 'A').trim().charAt(0).toUpperCase() || 'A';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-gradient text-ink font-bold overflow-hidden',
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ?? 'avatar'} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
