import { ReactNode, useEffect, useRef } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (closeOnBackdrop && e.target === el) onClose();
    };
    el.addEventListener('cancel', handleCancel);
    el.addEventListener('click', handleClick);
    return () => {
      el.removeEventListener('cancel', handleCancel);
      el.removeEventListener('click', handleClick);
    };
  }, [onClose, closeOnBackdrop]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-900/90 backdrop-blur-md animate-fadeIn backdrop:bg-transparent p-0 m-auto"
    >
      <div
        className={cn(
          'bg-navy-800 border border-border rounded-xl p-10 w-[380px] max-w-[90vw] text-center animate-popIn',
          className,
        )}
      >
        {children}
      </div>
    </dialog>
  );
}
