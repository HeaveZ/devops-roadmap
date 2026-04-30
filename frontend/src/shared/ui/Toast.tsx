import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { cn } from '../lib/cn';

type ToastKind = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = Date.now() + crypto.getRandomValues(new Uint32Array(1))[0];
      setItems((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-5 right-5 z-[2000] flex flex-col gap-2.5 max-w-sm">
        {items.map((t) => (
          <output
            key={t.id}
            className={cn(
              'block px-5 py-3.5 rounded-xl border text-sm shadow-card-hover backdrop-blur-md animate-popIn',
              t.kind === 'success' &&
                'bg-status-green/10 border-status-green/30 text-status-green',
              t.kind === 'error' &&
                'bg-status-red/10 border-status-red/30 text-status-red',
              t.kind === 'info' && 'bg-navy-800/90 border-border/60 text-ink',
            )}
          >
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="w-full text-left text-inherit font-medium"
            >
              {t.message}
            </button>
          </output>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
