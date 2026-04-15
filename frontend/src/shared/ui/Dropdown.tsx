import { ReactNode, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { useClickOutside } from '../hooks/useClickOutside';

interface DropdownItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface DropdownProps {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            'absolute top-[calc(100%+8px)] min-w-[200px] bg-navy-800 border border-border rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden z-20 animate-fadeIn',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors',
                item.danger
                  ? 'text-status-red hover:bg-status-red/10'
                  : 'text-ink hover:bg-navy-700',
              )}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
