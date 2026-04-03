import { useMemo, useState } from 'react';
import { Checkbox } from '../ui/Checkbox';
import { formControlSurfaceClassName } from './controlStyles';
import { SearchInput } from './SearchInput';

interface MultiSelectOption {
  label: string;
  value: string;
  description?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  emptyMessage = 'No hay opciones disponibles.',
  searchable = false,
  searchPlaceholder = 'Buscar opción...',
}: MultiSelectProps) {
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalizedSearch),
    );
  }, [options, search]);

  const toggle = (nextValue: string) => {
    onChange(
      value.includes(nextValue)
        ? value.filter((item) => item !== nextValue)
        : [...value, nextValue],
    );
  };

  return (
    <div className={`${formControlSurfaceClassName} max-h-72 space-y-2 overflow-hidden p-3`}>
      {searchable ? (
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          placeholder={searchPlaceholder}
          className="mb-1"
        />
      ) : null}
      <div className="max-h-56 space-y-2 overflow-auto">
        {filteredOptions.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        ) : null}
        {filteredOptions.map((option) => (
          <label key={option.value} className="flex items-start gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <Checkbox checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
            <span>
              <span className="block font-medium text-slate-900">{option.label}</span>
              {option.description ? (
                <span className="block text-xs text-slate-500">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
