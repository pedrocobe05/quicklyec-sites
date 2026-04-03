import { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface DataTableShellProps extends HTMLAttributes<HTMLDivElement> {}

interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {}

export function DataTableShell({ className, ...props }: DataTableShellProps) {
  return (
    <div
      className={cn(
        'mt-6 w-full overflow-x-auto rounded-3xl border border-slate-200 bg-white',
        className,
      )}
      {...props}
    />
  );
}

export function DataTable({ className, ...props }: DataTableProps) {
  return <table className={cn('w-full min-w-full table-auto text-left text-sm', className)} {...props} />;
}
