import { cn } from '../../utils/cn';

interface BrandMarkProps {
  compact?: boolean;
  subtitle?: string;
  className?: string;
  tone?: 'dark' | 'light';
}

export function BrandMark({
  compact = false,
  subtitle,
  className,
  tone = 'dark',
}: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(255,203,48,0.22)] bg-white/8 p-2 shadow-[0_12px_30px_rgba(0,1,32,0.18)] backdrop-blur-sm">
        <img src="/logo.png" alt="QuicklyEC" className="h-full w-full object-contain" />
      </div>
      {!compact ? (
        <div>
          <p
            className={cn(
              'text-[0.72rem] uppercase tracking-[0.28em]',
              tone === 'light' ? 'text-[var(--brand-gold)]' : 'text-[var(--brand-gold-deep)]',
            )}
          >
            {subtitle ?? 'Administración de plataforma'}
          </p>
          <h1
            className={cn(
              'text-xl font-semibold tracking-tight',
              tone === 'light' ? 'text-white' : 'text-[var(--brand-navy)]',
            )}
          >
            QuicklyEC
          </h1>
        </div>
      ) : null}
    </div>
  );
}
