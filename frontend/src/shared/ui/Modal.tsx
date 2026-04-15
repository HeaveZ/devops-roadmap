import { ReactNode, useEffect } from 'react';
import { cn } from '../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  children,
  className,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-900/90 backdrop-blur-md animate-fadeIn"
      onClick={() => closeOnBackdrop && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'bg-navy-800 border border-border rounded-xl p-10 w-[380px] max-w-[90vw] text-center animate-popIn',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
