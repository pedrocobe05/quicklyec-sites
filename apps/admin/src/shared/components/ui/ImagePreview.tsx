import { cn } from '../../utils/cn';

interface ImagePreviewProps {
  src?: string | null;
  alt?: string;
  label?: string;
  className?: string;
  imgClassName?: string;
}

export function ImagePreview({
  src,
  alt = 'Vista previa',
  label,
  className,
  imgClassName,
}: ImagePreviewProps) {
  if (!src) {
    return (
      <div className={cn('flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-400', className)}>
        Sin imagen
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <img src={src} alt={alt} className={cn('h-full w-full object-cover', imgClassName)} />
      {label ? (
        <div className="border-t border-slate-100 bg-white/95 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
      ) : null}
    </div>
  );
}
