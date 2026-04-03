import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  loadingLabel?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--brand-navy)] text-white shadow-[0_18px_42px_rgba(0,1,32,0.20)] hover:bg-[#040632] disabled:bg-slate-400',
  secondary:
    'border border-[rgba(15,23,42,0.10)] bg-white/92 text-slate-900 shadow-[0_10px_26px_rgba(15,23,42,0.06)] hover:bg-white disabled:text-slate-400',
  ghost:
    'border border-[rgba(15,23,42,0.08)] bg-white/72 text-slate-600 hover:bg-white hover:text-slate-900',
  danger: 'bg-[#d92d20] text-white shadow-[0_14px_32px_rgba(217,45,32,0.18)] hover:bg-[#b42318] disabled:bg-red-300',
};

export function Button({
  className,
  variant = 'primary',
  isLoading = false,
  loadingLabel,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
