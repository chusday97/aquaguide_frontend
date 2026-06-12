import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type ToastTone = 'success' | 'error';

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(item => item.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismissToast(id), 2600);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[300] flex flex-col items-center gap-2 px-4 md:top-6">
        {toasts.map(toast => {
          const Icon = toast.tone === 'success' ? CheckCircle2 : AlertTriangle;
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-[420px] items-center gap-2 rounded-[18px] border bg-white px-3 py-2.5 text-sm font-black shadow-[0_18px_48px_rgba(15,23,42,0.14)] ${
                toast.tone === 'success'
                  ? 'border-emerald-100 text-emerald-800'
                  : 'border-red-100 text-red-700'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">{toast.message}</span>
              <button
                type="button"
                aria-label="关闭提示"
                onClick={() => dismissToast(toast.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/35 hover:bg-bg hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

