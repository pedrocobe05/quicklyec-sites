import { PropsWithChildren } from 'react';

interface FormFieldProps extends PropsWithChildren {
  label: string;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
}

export function FormField({
  label,
  error,
  required = false,
  optional = false,
  children,
}: FormFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="relative pr-14 text-sm font-medium leading-5 text-slate-700">
        <span className="flex items-center gap-1.5">
          <span>{label}</span>
          {required ? <span className="text-base leading-none text-red-600">*</span> : null}
        </span>
        {!required && optional ? (
          <span className="absolute right-0 top-0 text-[0.56rem] font-medium uppercase tracking-[0.1em] text-slate-400">
            Opcional
          </span>
        ) : null}
      </span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
