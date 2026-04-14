import { FormEvent } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { Checkbox } from '../../../shared/components/ui/Checkbox';
import { FormField } from '../../../shared/components/forms/FormField';

interface DomainRecord {
  id: string;
  domain: string;
  type: string;
  verificationStatus: string;
  isPrimary: boolean;
}

interface DomainsSectionProps {
  saving: string | null;
  domains: DomainRecord[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (domain: DomainRecord) => void;
  onDelete: (domain: DomainRecord) => void;
  itemRow: (props: {
    title: string;
    subtitle: string;
    meta?: string;
    actionLabel: string;
    onAction: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    secondaryActionVariant?: 'secondary' | 'danger';
    disabled?: boolean;
  }) => JSX.Element;
}

export function DomainsSection({
  saving,
  domains,
  onSubmit,
  onEdit,
  onDelete,
  itemRow,
}: DomainsSectionProps) {
  return (
    <article id="domains" className="rounded-[2rem] bg-white p-6 shadow-sm scroll-mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-2xl">Dominios</h3>
        <span className="text-sm text-slate-500">Subdominio y custom domains</span>
      </div>
      <form
        className="mt-5 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.6fr_auto]"
        onSubmit={onSubmit}
      >
        <FormField label="Dominio">
          <Input name="domain" placeholder="midominio.com" />
        </FormField>
        <FormField label="Tipo">
          <Select name="type">
            <option value="custom">custom</option>
            <option value="subdomain">subdomain</option>
          </Select>
        </FormField>
        <FormField label="Verificación">
          <Select name="verificationStatus">
            <option value="pending">pending</option>
            <option value="verified">verified</option>
          </Select>
        </FormField>
        <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
          <Checkbox type="checkbox" name="isPrimary" /> Primario
        </label>
        <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold md:col-span-4">
          {saving === 'domain' ? 'Guardando...' : 'Agregar dominio'}
        </Button>
      </form>
      <div className="mt-6 grid gap-3">
        {domains.map((domain) =>
          itemRow({
            title: domain.domain,
            subtitle: `${domain.type} · ${domain.verificationStatus}`,
            meta: domain.isPrimary ? 'Dominio primario' : 'Dominio secundario',
            actionLabel: 'Editar',
            onAction: () => onEdit(domain),
            secondaryActionLabel: saving === `delete-domain-${domain.id}` ? 'Eliminando...' : 'Eliminar',
            onSecondaryAction: () => onDelete(domain),
            secondaryActionVariant: 'danger',
          }),
        )}
      </div>
    </article>
  );
}
