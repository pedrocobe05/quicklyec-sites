import { FormEvent, Fragment } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { FormField } from '../../../shared/components/forms/FormField';
import { Card } from '../../../shared/components/ui/Card';
import { ImagePreview } from '../../../shared/components/ui/ImagePreview';

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
  phone?: string | null;
  avatarUrl?: string | null;
  serviceIds?: string[];
  serviceNames?: string[];
  isActive?: boolean;
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
  onDeleteService: (service: ServiceRecord) => void;
  onDeleteStaff: (staff: StaffRecord) => void;
  onUploadStaffAvatar: (staff: StaffRecord, file: File) => void;
  itemRow: (props: {
    title: string;
    subtitle: string;
    meta?: string;
    actionLabel: string;
    onAction: () => void;
    disabled?: boolean;
    visual?: JSX.Element;
    uploadSlot?: JSX.Element;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    secondaryActionVariant?: 'secondary' | 'danger';
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
  onDeleteService,
  onDeleteStaff,
  onUploadStaffAvatar,
  itemRow,
}: ServicesStaffSectionProps) {
  const visibleCards =
    (canAccessServices && (showBoth || currentPath !== '/staff') ? 1 : 0)
    + (canAccessStaff && (showBoth || currentPath !== '/services') ? 1 : 0);

  return (
    <div className={visibleCards > 1 ? 'grid gap-6 xl:grid-cols-2' : 'grid gap-6'}>
      {canAccessServices && (showBoth || currentPath !== '/staff') ? (
        <Card id="services" className="scroll-mt-6 rounded-[2rem]">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">Servicios</h3>
            <span className="text-sm text-slate-500">Oferta comercial y duración</span>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5">
              <div className="mb-4">
                <h4 className="text-base font-semibold text-slate-900">Nuevo servicio</h4>
                <p className="mt-1 text-sm text-slate-500">Crea el catálogo general del tenant desde aquí.</p>
              </div>
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
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Servicios creados</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {services.length} servicio{services.length === 1 ? '' : 's'} en este tenant.
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                {services.map((service) => (
                  <Fragment key={service.id}>
                    {itemRow({
                      title: service.name,
                      subtitle: `${service.durationMinutes} min · ${service.price ? `$${service.price}` : 'Sin precio'}`,
                      meta: [
                        service.description,
                        service.isActive ? 'Activo' : 'Inactivo',
                      ].filter(Boolean).join(' · '),
                      actionLabel: 'Editar',
                      onAction: () => onEditService(service),
                      secondaryActionLabel: saving === `delete-service-${service.id}` ? 'Procesando...' : (service.isActive ? 'Eliminar' : 'Depurar'),
                      onSecondaryAction: () => onDeleteService(service),
                      secondaryActionVariant: service.isActive ? 'danger' : 'secondary',
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {canAccessStaff && (showBoth || currentPath !== '/services') ? (
        <Card id="staff" className="scroll-mt-6 rounded-[2rem]">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl">Staff</h3>
            <span className="text-sm text-slate-500">Personal y servicios asignados</span>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5">
              <div className="mb-4">
                <h4 className="text-base font-semibold text-slate-900">Nuevo integrante</h4>
                <p className="mt-1 text-sm text-slate-500">Crea el personal del tenant y asigna qué servicios puede atender.</p>
              </div>
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
                <div className="grid gap-2 rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-medium text-slate-700">Servicios que presta</p>
                  {services.length === 0 ? (
                    <p className="text-sm text-slate-500">Crea servicios primero para poder asignarlos al personal.</p>
                  ) : (
                    services.map((service) => (
                      <label key={service.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="serviceIds" value={service.id} />
                        <span>{service.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold">
                  {saving === 'staff' ? 'Guardando...' : 'Crear integrante'}
                </Button>
              </form>
            </div>
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Personal creado</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {staff.length} integrante{staff.length === 1 ? '' : 's'} en este tenant.
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                {staff.map((member) => (
                  <Fragment key={member.id}>
                    {itemRow({
                      title: member.name,
                      subtitle: member.email ?? 'Sin correo',
                      meta: [
                        member.bio ?? 'Sin biografía',
                        member.serviceNames?.length ? `Servicios: ${member.serviceNames.join(', ')}` : 'Sin servicios asignados',
                        member.isActive === false ? 'Inactivo' : 'Activo',
                      ].join(' · '),
                      actionLabel: 'Editar',
                      onAction: () => onEditStaff(member),
                      secondaryActionLabel: saving === `delete-staff-${member.id}` ? 'Procesando...' : (member.isActive === false ? 'Depurar' : 'Eliminar'),
                      onSecondaryAction: () => onDeleteStaff(member),
                      secondaryActionVariant: member.isActive === false ? 'secondary' : 'danger',
                      visual: (
                        <ImagePreview
                          src={member.avatarUrl}
                          alt={member.name}
                          className="h-16 w-16"
                          imgClassName="h-16 w-16 object-cover"
                        />
                      ),
                      uploadSlot: (
                        <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                          Foto
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              onUploadStaffAvatar(member, file);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                      ),
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
