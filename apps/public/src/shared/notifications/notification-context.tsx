import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { PublicNotificationDetail, PublicNotificationVariant } from './notifications';

interface NotificationItem {
  id: number;
  title: string;
  variant: PublicNotificationVariant;
}

export function PublicNotificationProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const enqueue = useMemo(
    () => (title: string, variant: PublicNotificationVariant = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setItems((current) => [...current, { id, title, variant }]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, 3600);
    },
    [],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PublicNotificationDetail>).detail;
      if (!detail?.title) {
        return;
      }
      enqueue(detail.title, detail.variant);
    };

    window.addEventListener('qs:public-notify', handler);
    return () => window.removeEventListener('qs:public-notify', handler);
  }, [enqueue]);

  return (
    <>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              'rounded-[1.4rem] border px-4 py-3 text-sm shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl',
              item.variant === 'success' && 'border-emerald-200/80 bg-emerald-50/95 text-emerald-800',
              item.variant === 'error' && 'border-rose-200/80 bg-rose-50/95 text-rose-800',
              item.variant === 'info' && 'border-slate-200/80 bg-white/92 text-slate-700',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.title}
          </div>
        ))}
      </div>
    </>
  );
}
