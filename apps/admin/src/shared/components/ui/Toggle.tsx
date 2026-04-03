import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onCheckedChange, label, description, className, disabled, type = 'button', ...props }, ref) => (
    <button
      {...props}
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onCheckedChange?.(!checked);
        }
      }}
      className={cn(
        'flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
        checked
          ? 'border-[rgba(255,203,48,0.38)] bg-[rgba(255,203,48,0.12)]'
          : 'border-slate-300 bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
        className,
      )}
    >
      <div className="min-w-0">
        {label ? <p className="text-sm font-medium text-slate-900">{label}</p> : null}
        {description ? <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p> : null}
      </div>
      <span
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition',
          checked
            ? 'border-[var(--brand-navy)] bg-[var(--brand-navy)]'
            : 'border-slate-500 bg-white shadow-sm',
        )}
      >
        <span
          className={cn(
            'absolute h-5 w-5 rounded-full shadow-sm transition',
            checked ? 'left-6 bg-white' : 'left-1 bg-[var(--brand-navy)]',
          )}
        />
      </span>
    </button>
  ),
);

Toggle.displayName = 'Toggle';
