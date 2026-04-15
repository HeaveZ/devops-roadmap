import { cn } from 'shared/lib/cn';
import { getPriorityInfo } from '../utils/priority';

interface Props {
  value?: string | null;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}

export function PriorityBadge({ value, onClick, disabled, title }: Props) {
  const info = getPriorityInfo(value);
  const clickable = !!onClick && !disabled;
  return (
    <span
      role={clickable ? 'button' : undefined}
      onClick={clickable ? onClick : undefined}
      title={title}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md border font-medium tracking-wide uppercase select-none',
        info.colorClass,
        clickable && 'cursor-pointer hover:brightness-110',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {info.key === 'none' ? '◇' : '◆'} {info.label}
    </span>
  );
}
