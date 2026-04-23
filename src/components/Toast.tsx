import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; message: string; type: ToastType; duration: number };

const Ctx = createContext<{ push: (msg: string, type?: ToastType, duration?: number) => void } | null>(null);

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = uid();
    const t: Toast = { id, message, type, duration };
    setToasts(s => [...s, t]);
    window.setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), duration);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return {
    push: ctx.push,
    success: (m: string, ms?: number) => ctx.push(m, 'success', ms),
    error:   (m: string, ms?: number) => ctx.push(m, 'error', ms),
    info:    (m: string, ms?: number) => ctx.push(m, 'info', ms),
  };
}
