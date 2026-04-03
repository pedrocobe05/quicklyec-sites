import { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { Input } from './Input';

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

interface DataTableToolbarProps extends HTMLAttributes<HTMLDivElement> {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  summary?: string;
  actions?: ReactNode;
}

export function DataTableToolbar({
  className,
  searchValue = '',
  searchPlaceholder = 'Buscar...',
  onSearchChange,
  summary,
  actions,
  ...props
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {summary ? <p className="text-sm text-slate-500">{summary}</p> : null}
        {onSearchChange ? (
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="max-w-md"
          />
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface DataTablePaginationProps extends HTMLAttributes<HTMLDivElement> {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  className,
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  ...props
}: DataTablePaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between',
        className,
      )}
      {...props}
    >
      <p>
        Mostrando {start}-{end} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span className="px-2 text-slate-700">
          Página {page} de {pageCount}
        </span>
        <Button type="button" variant="secondary" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
