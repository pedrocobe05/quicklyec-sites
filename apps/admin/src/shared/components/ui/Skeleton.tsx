import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-sheen rounded-2xl border border-white/50 bg-gradient-to-r from-slate-200/80 via-slate-100 to-slate-200/80',
        className,
      )}
    />
  );
}
