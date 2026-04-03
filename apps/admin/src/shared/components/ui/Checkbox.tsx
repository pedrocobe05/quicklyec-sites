import { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-200',
        className,
      )}
      {...props}
    />
  );
}
