import { forwardRef, InputHTMLAttributes } from 'react';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, value, ...props }, ref) => (
    <div className="relative">
      <Input
        ref={ref}
        value={value}
        className={cn('pr-10', className)}
        {...props}
      />
      {String(value ?? '').length > 0 && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 transition hover:text-[var(--brand-navy)]"
        >
          Limpiar
        </button>
      ) : null}
    </div>
  ),
);

SearchInput.displayName = 'SearchInput';
