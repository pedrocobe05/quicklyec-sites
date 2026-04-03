import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { formControlClassName, formControlSurfaceClassName } from './controlStyles';
import { SearchInput } from './SearchInput';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay coincidencias.',
  disabled = false,
  className,
  clearable = false,
}: SearchableSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalizedSearch),
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    const updateMenuPosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) {
        return;
      }

      setMenuStyle({
        top: triggerRect.bottom + 8,
        left: triggerRect.left,
        width: triggerRect.width,
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', open ? 'z-[120]' : 'z-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          formControlClassName,
          clearable && value
            ? 'flex items-center justify-between pr-24 text-left'
            : 'flex items-center justify-between pr-12 text-left',
          open ? 'border-[var(--brand-gold-deep)] ring-2 ring-[rgba(255,203,48,0.18)]' : '',
        )}
      >
        <span className="min-w-0">
          <span className={selectedOption ? 'block text-clamp-1 text-slate-900' : 'block text-clamp-1 text-slate-400'}>
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption?.description ? (
            <span className="block text-clamp-1 text-xs text-slate-500">{selectedOption.description}</span>
          ) : null}
        </span>
      </button>
      {clearable && value ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange('');
            setOpen(false);
          }}
          className="absolute right-9 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:text-[var(--brand-navy)]"
        >
          Limpiar
        </button>
      ) : null}
      <span className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-xs text-slate-400">
        {open ? '▲' : '▼'}
      </span>

      {open
        ? createPortal(
            <div
              className={cn(
                formControlSurfaceClassName,
                'fixed z-[240] p-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)]',
              )}
              style={menuStyle}
            >
              <SearchInput
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onClear={() => setSearch('')}
                placeholder={searchPlaceholder}
                className="mb-3"
              />
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500">{emptyMessage}</p>
                ) : null}
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpen(false);
                      setSearch('');
                      onChange(option.value);
                    }}
                    className={cn(
                      'flex w-full items-start justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50',
                      option.value === value ? 'bg-[rgba(255,203,48,0.12)]' : '',
                    )}
                    onClick={(event) => event.preventDefault()}
                  >
                    <span className="min-w-0">
                      <span className="block text-clamp-1 font-medium text-slate-900">{option.label}</span>
                      {option.description ? (
                        <span className="block text-clamp-2 text-xs text-slate-500">{option.description}</span>
                      ) : null}
                    </span>
                    {option.value === value ? (
                      <span className="ml-3 text-xs font-medium text-[var(--brand-gold-deep)]">
                        Seleccionado
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
