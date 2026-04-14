import { PropsWithChildren, createContext, useMemo, useState } from 'react';

export interface NotificationItem {
  id: number;
  title: string;
  variant: 'success' | 'error' | 'info';
}

export interface NotificationContextValue {
  notify: (title: string, variant?: NotificationItem['variant']) => void;
}

function normalizeNotificationTitle(title: unknown) {
  if (typeof title === 'string') {
    const normalized = title.trim();
    if (normalized && normalized.toLowerCase() !== 'null' && normalized.toLowerCase() !== 'undefined') {
      return normalized;
    }
  }

  return 'No se pudo completar la acción.';
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const value = useMemo(
    () => ({
      notify: (title: string, variant: NotificationItem['variant'] = 'info') => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setItems((current) => [...current, { id, title: normalizeNotificationTitle(title), variant }]);
        window.setTimeout(() => {
          setItems((current) => current.filter((item) => item.id !== id));
        }, 3500);
      },
    }),
    [],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              'rounded-2xl border px-4 py-3 text-sm shadow-panel backdrop-blur',
              item.variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              item.variant === 'error' && 'border-red-200 bg-red-50 text-red-700',
              item.variant === 'info' && 'border-slate-200 bg-white/90 text-slate-700',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.title}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
