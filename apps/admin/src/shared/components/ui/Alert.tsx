import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface AlertProps {
  children: ReactNode;
  variant?: 'error' | 'info' | 'success';
}

export function Alert({ children, variant = 'info' }: AlertProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm',
        variant === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : variant === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-700',
      )}
    >
      {children}
    </div>
  );
}
