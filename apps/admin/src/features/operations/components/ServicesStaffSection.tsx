import { FormEvent, Fragment } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { FormField } from '../../../shared/components/forms/FormField';
import { Card } from '../../../shared/components/ui/Card';

interface ServiceRecord {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price?: number | null;
  category?: string | null;
  isActive: boolean;
}

interface StaffRecord {
  id: string;
  name: string;
  bio?: string | null;
  email?: string | null;
}

interface ServicesStaffSectionProps {
  currentPath: string;
  showBoth?: boolean;
  canAccessServices: boolean;
  canAccessStaff: boolean;
  saving: string | null;
  services: ServiceRecord[];
  staff: StaffRecord[];
  onCreateService: (event: FormEvent<HTMLFormElement>) => void;
  onCreateStaff: (event: FormEvent<HTMLFormElement>) => void;
  onEditService: (service: ServiceRecord) => void;
  onEditStaff: (staff: StaffRecord) => void;
  itemRow: (props: {
    title: string;
    subtitle: string;
    meta?: string;
    actionLabel: string;
    onAction: () => void;
    disabled?: boolean;
  }) => JSX.Element;
}

export function ServicesStaffSection({
  currentPath,
  showBoth = false,
  canAccessServices,
  canAccessStaff,
  saving,
  services,
  staff,
  onCreateService,
  onCreateStaff,
  onEditService,
  onEditStaff,
  itemRow,
}: ServicesStaffSectionProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {canAccessServices && (showBoth || currentPath !== '/staff') ? (
        <Card id="services" className="scroll-mt-6 rounded-[2rem]">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">Servicios</h3>
            <span className="text-sm text-slate-500">Oferta comercial y duración</span>
          </div>
          <div className="mt-5">
            <form className="grid gap-3" onSubmit={onCreateService}>
              <FormField label="Nombre" required>
                <Input name="name" placeholder="Nombre" />
              </FormField>
              <FormField label="Descripción">
                <Textarea name="description" placeholder="Descripción" className="min-h-20" />
              </FormField>
              <div className="grid gap-3 md:grid-cols-3">
                <FormField label="Minutos">
                  <Input name="durationMinutes" type="number" placeholder="Minutos" />
                </FormField>
                <FormField label="Precio">
                  <Input name="price" type="number" step="0.01" placeholder="Precio" />
                </FormField>
                <FormField label="Categoría">
                  <Input name="category" placeholder="Categoría" />
                </FormField>
              </div>
              <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold">
                {saving === 'service' ? 'Guardando...' : 'Crear servicio'}
              </Button>
            </form>
          </div>
          <div className="mt-6 grid gap-3">
            {services.map((service) => (
              <Fragment key={service.id}>
                {itemRow({
                  title: service.name,
                  subtitle: `${service.durationMinutes} min · ${service.price ? `$${service.price}` : 'Sin precio'}`,
                  meta: service.description,
                  actionLabel: saving === `delete-service-${service.id}` ? 'Eliminando...' : 'Eliminar',
                  onAction: () => onEditService(service),
                })}
              </Fragment>
            ))}
          </div>
        </Card>
      ) : null}

      {canAccessStaff && (showBoth || currentPath !== '/services') ? (
        <Card id="staff" className="scroll-mt-6 rounded-[2rem]">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">Equipo</h3>
            <span className="text-sm text-slate-500">Equipo visible para reservas</span>
          </div>
          <div className="mt-5">
            <form className="grid gap-3" onSubmit={onCreateStaff}>
              <FormField label="Nombre" required>
                <Input name="name" placeholder="Nombre" />
              </FormField>
              <FormField label="Biografía">
                <Textarea name="bio" placeholder="Biografía" className="min-h-20" />
              </FormField>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Correo">
                  <Input name="email" placeholder="Correo" />
                </FormField>
                <FormField label="Teléfono">
                  <Input name="phone" placeholder="Teléfono" />
                </FormField>
              </div>
              <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold">
                {saving === 'staff' ? 'Guardando...' : 'Crear integrante'}
              </Button>
            </form>
          </div>
          <div className="mt-6 grid gap-3">
            {staff.map((member) => (
              <Fragment key={member.id}>
                {itemRow({
                  title: member.name,
                  subtitle: member.email ?? 'Sin correo',
                  meta: member.bio ?? 'Sin biografía',
                  actionLabel: saving === `delete-staff-${member.id}` ? 'Eliminando...' : 'Eliminar',
                  onAction: () => onEditStaff(member),
                })}
              </Fragment>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
