import { FormEvent, useEffect, useState } from 'react';
import { Alert } from '../../../shared/components/ui/Alert';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { Select } from '../../../shared/components/ui/Select';
import { Checkbox } from '../../../shared/components/ui/Checkbox';
import { FormField } from '../../../shared/components/forms/FormField';
import { Modal } from '../../../shared/components/modal/Modal';
import { ImagePreview } from '../../../shared/components/ui/ImagePreview';

type PlatformTenantRecord = { id: string; name: string; slug: string; status: string; plan: string };
type PlatformPlanRecord = { id: string; code: string; name: string };
type TenantRoleRecord = { id: string; code: string; name: string; description?: string | null; isActive: boolean; permissions: string[] };
type TenantMembershipRecord = {
  id: string;
  role: string;
  roleId?: string | null;
  roleName?: string | null;
  isActive: boolean;
  user?: { fullName?: string; email?: string };
};
type DomainRecord = { id: string; domain: string; type: string; verificationStatus: string; isPrimary: boolean };
type ServiceRecord = { id: string; name: string; description: string; durationMinutes: number; price?: number | null; category?: string | null; isActive: boolean };
type StaffRecord = {
  id: string;
  name: string;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  serviceIds?: string[];
};
type PageRecord = { id: string; slug: string; title: string; isHome: boolean; isPublished: boolean; ogImageUrl?: string | null };
type SectionRecord = { id: string; type: string; variant: string; position: number; isVisible: boolean; content: Record<string, unknown> };
type AvailabilityRuleRecord = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  isActive: boolean;
  staffId?: string | null;
};
type ScheduleBlockRecord = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  blockType: string;
  staffId?: string | null;
};
type AppointmentRecord = {
  id: string;
  startDateTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  paymentMethod?: 'cash' | 'transfer' | 'payphone' | null;
  notes?: string | null;
  internalNotes?: string | null;
  staff?: { id?: string; name?: string } | null;
  service?: { name?: string } | null;
};
type CustomerRecord = { id: string; fullName: string; email: string; phone: string; identification?: string | null; notes?: string | null };
type SectionAssetRecord = { name: string; url: string; alt?: string | null; label?: string | null; kind?: 'image' };

function normalizeAssetAlias(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureUniqueAssetAlias(assets: SectionAssetRecord[], value: string, currentIndex: number) {
  const baseAlias = normalizeAssetAlias(value) || `asset-${currentIndex + 1}`;
  let candidate = baseAlias;
  let suffix = 2;

  while (assets.some((asset, index) => index !== currentIndex && asset.name === candidate)) {
    candidate = `${baseAlias}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export type EditModalState =
  | { type: 'tenant-plan'; item: PlatformTenantRecord }
  | { type: 'membership'; item: TenantMembershipRecord }
  | { type: 'role'; item: TenantRoleRecord }
  | { type: 'domain'; item: DomainRecord }
  | { type: 'service'; item: ServiceRecord }
  | { type: 'staff'; item: StaffRecord }
  | { type: 'page'; item: PageRecord }
  | { type: 'section'; item: SectionRecord }
  | { type: 'rule'; item: AvailabilityRuleRecord }
  | { type: 'block'; item: ScheduleBlockRecord }
  | { type: 'appointment'; item: AppointmentRecord }
  | { type: 'customer'; item: CustomerRecord };

interface EditEntityModalProps {
  editModal: EditModalState | null;
  savingKey: string | null;
  generatedPassword: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
  onCloseGeneratedPassword: () => void;
  days: string[];
  tenantRoles?: TenantRoleRecord[];
  planOptions?: PlatformPlanRecord[];
  rolePermissionGroups?: Array<{
    module: string;
    label: string;
    permissions: string[];
  }>;
  sectionTypeOptions?: Array<{ value: string; label: string; description?: string }>;
  services?: Array<{ id: string; name: string }>;
  staffOptions?: Array<{ id: string; name: string }>;
}

export function EditEntityModal({
  editModal,
  savingKey,
  generatedPassword,
  onClose,
  onSubmit,
  onDelete,
  onCloseGeneratedPassword,
  days,
  tenantRoles = [],
  planOptions = [],
  rolePermissionGroups = [],
  sectionTypeOptions = [],
  services = [],
  staffOptions = [],
}: EditEntityModalProps) {
  const [sectionAssets, setSectionAssets] = useState<SectionAssetRecord[]>([]);
  const [customHtmlSource, setCustomHtmlSource] = useState('');

  useEffect(() => {
    if (editModal?.type === 'section' && editModal.item.type === 'custom_html') {
      setSectionAssets(
        Array.isArray(editModal.item.content.assets)
          ? (editModal.item.content.assets as SectionAssetRecord[])
          : [],
      );
      setCustomHtmlSource(String(editModal.item.content.html ?? ''));
      return;
    }

    setSectionAssets([]);
    setCustomHtmlSource('');
  }, [editModal]);

  const requiredAssetAliases = Array.from(
    customHtmlSource.matchAll(/\{\{\s*asset:([a-zA-Z0-9._-]+)\s*\}\}/g),
    (match) => match[1],
  ).filter((value, index, values) => values.indexOf(value) === index);

  return (
    <>
      <Modal
        open={Boolean(editModal)}
        onClose={onClose}
        title={
          editModal?.type === 'tenant-plan' ? 'Cambiar plan de la empresa'
          : editModal?.type === 'membership' ? 'Editar usuario'
          : editModal?.type === 'role' ? 'Editar rol'
          : editModal?.type === 'domain' ? 'Editar dominio'
          : editModal?.type === 'service' ? 'Editar servicio'
          : editModal?.type === 'staff' ? 'Editar integrante'
          : editModal?.type === 'page' ? 'Editar página'
          : editModal?.type === 'section' ? 'Editar sección'
          : editModal?.type === 'rule' ? 'Editar regla'
          : editModal?.type === 'block' ? 'Editar bloqueo'
          : editModal?.type === 'appointment' ? 'Reagendar reserva'
          : editModal?.type === 'customer' ? 'Editar cliente'
          : 'Editar'
        }
      >
        {editModal ? (
          <form className="grid gap-4" onSubmit={onSubmit}>
            {editModal.type === 'tenant-plan' ? (
              <FormField label="Plan" required>
                <Select name="plan" defaultValue={editModal.item.plan}>
                  {planOptions.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : null}

            {editModal.type === 'membership' ? (
              <>
                <FormField label="Nombre completo" required>
                  <Input name="fullName" defaultValue={editModal.item.user?.fullName ?? ''} />
                </FormField>
                <FormField label="Correo" required>
                  <Input name="email" type="email" defaultValue={editModal.item.user?.email ?? ''} />
                </FormField>
                <FormField label="Rol" required>
                  <Select name="roleId" defaultValue={editModal.item.roleId ?? ''}>
                    {tenantRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Checkbox type="checkbox" name="isActive" defaultChecked={editModal.item.isActive} /> Activo
                </label>
              </>
            ) : null}

            {editModal.type === 'role' ? (
              <>
                <FormField label="Nombre" required>
                  <Input name="name" defaultValue={editModal.item.name} />
                </FormField>
                <FormField label="Descripción">
                  <Textarea name="description" defaultValue={editModal.item.description ?? ''} />
                </FormField>
                <div className="grid gap-4">
                  {rolePermissionGroups.map((group) => (
                    <div key={group.module} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {group.permissions.map((permission) => (
                          <label key={permission} className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox
                              type="checkbox"
                              name="permissions"
                              value={permission}
                              defaultChecked={editModal.item.permissions.includes(permission)}
                            />
                            {permission}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Checkbox type="checkbox" name="isActive" defaultChecked={editModal.item.isActive} /> Activo
                </label>
              </>
            ) : null}

            {editModal.type === 'domain' ? (
              <>
                <FormField label="Dominio" required>
                  <Input name="domain" defaultValue={editModal.item.domain} />
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Tipo">
                    <Select name="type" defaultValue={editModal.item.type}>
                      <option value="custom">custom</option>
                      <option value="subdomain">subdomain</option>
                    </Select>
                  </FormField>
                  <FormField label="Verificación">
                    <Select name="verificationStatus" defaultValue={editModal.item.verificationStatus}>
                      <option value="pending">pending</option>
                      <option value="verified">verified</option>
                    </Select>
                  </FormField>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Checkbox type="checkbox" name="isPrimary" defaultChecked={editModal.item.isPrimary} /> Primario
                </label>
              </>
            ) : null}

            {editModal.type === 'service' ? (
              <>
                <FormField label="Nombre" required>
                  <Input name="name" defaultValue={editModal.item.name} />
                </FormField>
                <FormField label="Descripción">
                  <Textarea name="description" defaultValue={editModal.item.description} />
                </FormField>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Minutos">
                    <Input name="durationMinutes" type="number" defaultValue={editModal.item.durationMinutes} />
                  </FormField>
                  <FormField label="Precio">
                    <Input name="price" type="number" step="0.01" defaultValue={editModal.item.price ?? ''} />
                  </FormField>
                  <FormField label="Categoría">
                    <Input name="category" defaultValue={editModal.item.category ?? ''} />
                  </FormField>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Checkbox type="checkbox" name="isActive" defaultChecked={editModal.item.isActive} /> Activo
                </label>
              </>
            ) : null}

            {editModal.type === 'staff' ? (
              <>
                <FormField label="Foto">
                  <Input name="avatarUrl" defaultValue={editModal.item.avatarUrl ?? ''} />
                </FormField>
                <ImagePreview
                  src={editModal.item.avatarUrl}
                  alt={editModal.item.name}
                  label="Vista previa"
                  className="h-32 w-full max-w-xs"
                  imgClassName="h-24 w-full object-cover"
                />
                <FormField label="Nombre" required>
                  <Input name="name" defaultValue={editModal.item.name} />
                </FormField>
                <FormField label="Biografía">
                  <Textarea name="bio" defaultValue={editModal.item.bio ?? ''} />
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Correo del profesional">
                    <Input name="email" type="email" defaultValue={editModal.item.email ?? ''} />
                  </FormField>
                  <FormField label="Teléfono">
                    <Input name="phone" defaultValue={editModal.item.phone ?? ''} />
                  </FormField>
                </div>
                <div className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Servicios asignados</p>
                  {services.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay servicios disponibles para asignar.</p>
                  ) : (
                    services.map((service) => (
                      <label key={service.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <Checkbox
                          type="checkbox"
                          name="serviceIds"
                          value={service.id}
                          defaultChecked={Boolean(editModal.item.serviceIds?.includes(service.id))}
                        />
                        <span>{service.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </>
            ) : null}

            {editModal.type === 'page' ? (
              <>
                <FormField label="Título" required>
                  <Input name="title" defaultValue={editModal.item.title} />
                </FormField>
                <FormField label="Slug" required>
                  <Input name="slug" defaultValue={editModal.item.slug} />
                </FormField>
                <FormField label="Imagen OG">
                  <Input name="ogImageUrl" defaultValue={editModal.item.ogImageUrl ?? ''} />
                </FormField>
                <ImagePreview src={editModal.item.ogImageUrl} alt={`OG ${editModal.item.title}`} label="Vista previa OG" className="h-32 w-full max-w-xs" imgClassName="h-24 w-full object-cover" />
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                    <Checkbox type="checkbox" name="isPublished" defaultChecked={editModal.item.isPublished} /> Publicada
                  </label>
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                    <Checkbox type="checkbox" name="isHome" defaultChecked={editModal.item.isHome} /> Inicio
                  </label>
                </div>
              </>
            ) : null}

            {editModal.type === 'rule' ? (
              <>
                <FormField label="Profesional">
                  <Select name="staffId" defaultValue={editModal.item.staffId ?? ''}>
                    <option value="">Todos / general</option>
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Día">
                    <Select name="dayOfWeek" defaultValue={String(editModal.item.dayOfWeek)}>
                      {days.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Intervalo">
                    <Input name="slotIntervalMinutes" type="number" defaultValue={editModal.item.slotIntervalMinutes} />
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Hora inicio">
                    <Input name="startTime" type="time" defaultValue={editModal.item.startTime} />
                  </FormField>
                  <FormField label="Hora fin">
                    <Input name="endTime" type="time" defaultValue={editModal.item.endTime} />
                  </FormField>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Checkbox type="checkbox" name="isActive" defaultChecked={editModal.item.isActive} /> Activa
                </label>
              </>
            ) : null}

            {editModal.type === 'block' ? (
              <>
                <FormField label="Profesional">
                  <Select name="staffId" defaultValue={editModal.item.staffId ?? ''}>
                    <option value="">Todos / general</option>
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Inicio">
                    <Input
                      name="startDateTime"
                      type="datetime-local"
                      defaultValue={editModal.item.startDateTime.slice(0, 16)}
                    />
                  </FormField>
                  <FormField label="Fin">
                    <Input
                      name="endDateTime"
                      type="datetime-local"
                      defaultValue={editModal.item.endDateTime.slice(0, 16)}
                    />
                  </FormField>
                </div>
                <FormField label="Motivo">
                  <Input name="reason" defaultValue={editModal.item.reason} />
                </FormField>
                <FormField label="Tipo">
                  <Select name="blockType" defaultValue={editModal.item.blockType}>
                    <option value="manual">Manual</option>
                    <option value="staff_unavailable">No disponible</option>
                    <option value="holiday">Feriado</option>
                  </Select>
                </FormField>
              </>
            ) : null}

            {editModal.type === 'section' ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Tipo">
                    <Select name="type" defaultValue={editModal.item.type}>
                      {sectionTypeOptions.length > 0 ? (
                        sectionTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      ) : (
                        <option value={editModal.item.type}>{editModal.item.type}</option>
                      )}
                    </Select>
                  </FormField>
                  <FormField label="Variante">
                    <Input name="variant" defaultValue={editModal.item.variant} />
                  </FormField>
                  <FormField label="Posición">
                    <Input name="position" type="number" defaultValue={editModal.item.position} />
                  </FormField>
                </div>
                {editModal.item.type === 'header' ? (
                  <>
                    <FormField label="Etiqueta superior">
                      <Input name="kicker" defaultValue={String(editModal.item.content.kicker ?? '')} />
                    </FormField>
                    <FormField label="Título">
                      <Input name="title" defaultValue={String(editModal.item.content.title ?? '')} />
                    </FormField>
                    <FormField label="Subtítulo">
                      <Textarea
                        name="subtitle"
                        defaultValue={String(editModal.item.content.subtitle ?? editModal.item.content.body ?? '')}
                      />
                    </FormField>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Texto botón">
                        <Input name="ctaLabel" defaultValue={String(editModal.item.content.ctaLabel ?? '')} />
                      </FormField>
                      <FormField label="URL botón">
                        <Input name="ctaUrl" defaultValue={String(editModal.item.content.ctaUrl ?? '')} placeholder="/contacto" />
                      </FormField>
                    </div>
                  </>
                ) : editModal.item.type === 'footer' ? (
                  <>
                    <FormField label="Texto del pie de página">
                      <Textarea
                        name="text"
                        defaultValue={String(editModal.item.content.text ?? editModal.item.content.body ?? '')}
                      />
                    </FormField>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Dirección">
                        <Input name="address" defaultValue={String(editModal.item.content.address ?? '')} />
                      </FormField>
                      <FormField label="Horario">
                        <Input name="hours" defaultValue={String(editModal.item.content.hours ?? '')} />
                      </FormField>
                      <FormField label="Instagram">
                        <Input name="instagram" defaultValue={String(editModal.item.content.instagram ?? '')} />
                      </FormField>
                      <FormField label="WhatsApp visible">
                        <Input name="footerWhatsapp" defaultValue={String(editModal.item.content.footerWhatsapp ?? '')} />
                      </FormField>
                    </div>
                  </>
                ) : editModal.item.type === 'custom_html' ? (
                  <>
                    <FormField label="HTML personalizado">
                      <Textarea
                        name="html"
                        value={customHtmlSource}
                        onChange={(event) => setCustomHtmlSource(event.target.value)}
                        className="min-h-40 font-mono text-xs"
                      />
                    </FormField>
                    <FormField label="CSS personalizado">
                      <Textarea
                        name="css"
                        defaultValue={String(editModal.item.content.css ?? '')}
                        className="min-h-32 font-mono text-xs"
                      />
                    </FormField>
                    <input type="hidden" name="assetsJson" value={JSON.stringify(sectionAssets)} readOnly />
                    <Alert variant="info">
                      Usa placeholders dentro del HTML como <span className="font-mono">{'{{asset:hero-main}}'}</span>. Los aliases se normalizan automáticamente para evitar errores.
                    </Alert>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Recursos requeridos por esta sección</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Detectados automáticamente desde los placeholders <span className="font-mono">{'{{asset:...}}'}</span> del HTML.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {requiredAssetAliases.length} requeridos
                        </span>
                      </div>
                      {requiredAssetAliases.length > 0 ? (
                        <div className="mt-4 grid gap-2">
                          {requiredAssetAliases.map((alias) => {
                            const matchedAsset = sectionAssets.find(
                              (asset) => normalizeAssetAlias(asset.name) === normalizeAssetAlias(alias),
                            );

                            return (
                              <div
                                key={alias}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="font-mono text-sm text-slate-900">{`{{asset:${alias}}}`}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {matchedAsset
                                      ? `Asignado a: ${matchedAsset.label?.trim() || matchedAsset.name}`
                                      : 'Aún no existe un recurso cargado con este alias'}
                                  </p>
                                </div>
                                <span
                                  className={[
                                    'rounded-full px-3 py-1 text-xs font-semibold',
                                    matchedAsset
                                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
                                  ].join(' ')}
                                >
                                  {matchedAsset ? 'Listo' : 'Falta recurso'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                          Este HTML todavía no usa placeholders de assets. Si agregas referencias como <span className="font-mono">{'{{asset:hero-main}}'}</span>, aparecerán aquí.
                        </div>
                      )}
                    </div>
                    {sectionAssets.length > 0 ? (
                      <div className="grid gap-3">
                        {sectionAssets.map((asset, index) => (
                          <div key={`${asset.name}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[110px,1fr]">
                            <ImagePreview
                              src={asset.url}
                              alt={asset.alt ?? asset.name}
                              label={asset.name}
                              className="h-28 w-full"
                              imgClassName="h-20 w-full object-cover"
                            />
                            <div className="grid gap-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <FormField label="Alias">
                                  <Input
                                    value={asset.name}
                                    onChange={(event) =>
                                      setSectionAssets((current) =>
                                        current.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, name: event.target.value } : item,
                                        ),
                                      )
                                    }
                                    onBlur={() =>
                                      setSectionAssets((current) =>
                                        current.map((item, itemIndex) =>
                                          itemIndex === index
                                            ? { ...item, name: ensureUniqueAssetAlias(current, item.name, itemIndex) }
                                            : item,
                                        ),
                                      )
                                    }
                                  />
                                </FormField>
                                <FormField label="Etiqueta">
                                  <Input
                                    value={asset.label ?? ''}
                                    onChange={(event) =>
                                      setSectionAssets((current) =>
                                        current.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, label: event.target.value } : item,
                                        ),
                                      )
                                    }
                                  />
                                </FormField>
                              </div>
                              <FormField label="Alt">
                                <Input
                                  value={asset.alt ?? ''}
                                  onChange={(event) =>
                                    setSectionAssets((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, alt: event.target.value } : item,
                                      ),
                                    )
                                  }
                                />
                              </FormField>
                              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Placeholder</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <code className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-800">
                                    {`{{asset:${normalizeAssetAlias(asset.name) || `asset-${index + 1}`}}}`}
                                  </code>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="h-8 px-3 text-xs"
                                    onClick={async () => {
                                      const placeholder = `{{asset:${normalizeAssetAlias(asset.name) || `asset-${index + 1}`}}}`;
                                      try {
                                        await navigator.clipboard.writeText(placeholder);
                                      } catch {
                                        // Ignore clipboard errors in unsupported environments.
                                      }
                                    }}
                                  >
                                    Copiar
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-9 px-3 text-xs"
                                  disabled={index === 0}
                                  onClick={() =>
                                    setSectionAssets((current) => {
                                      const next = [...current];
                                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                      return next;
                                    })
                                  }
                                >
                                  Subir
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-9 px-3 text-xs"
                                  disabled={index === sectionAssets.length - 1}
                                  onClick={() =>
                                    setSectionAssets((current) => {
                                      const next = [...current];
                                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                      return next;
                                    })
                                  }
                                >
                                  Bajar
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  className="h-9 px-3 text-xs"
                                  onClick={() =>
                                    setSectionAssets((current) => current.filter((_, itemIndex) => itemIndex !== index))
                                  }
                                >
                                  Eliminar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-500">
                        Esta sección aún no tiene assets visuales. Súbelos desde el listado de secciones y luego usa aquí sus placeholders.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <FormField label="Título">
                      <Input name="title" defaultValue={String(editModal.item.content.title ?? '')} />
                    </FormField>
                    <FormField label="Descripción">
                      <Textarea name="body" defaultValue={String(editModal.item.content.body ?? '')} />
                    </FormField>
                    <FormField label="Imagen">
                      <Input name="imageUrl" defaultValue={String(editModal.item.content.imageUrl ?? '')} />
                    </FormField>
                    <ImagePreview
                      src={String(editModal.item.content.imageUrl ?? '') || undefined}
                      alt={`Vista previa ${editModal.item.type}`}
                      label="Vista previa"
                      className="h-32 w-full max-w-xs"
                      imgClassName="h-24 w-full object-cover"
                    />
                  </>
                )}
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Checkbox type="checkbox" name="isVisible" defaultChecked={editModal.item.isVisible} /> Visible
                </label>
              </>
            ) : null}

            {editModal.type === 'appointment' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Profesional asignado">
                    <Input value={editModal.item.staff?.name ?? 'Por asignar'} readOnly />
                  </FormField>
                  <FormField label="Servicio">
                    <Input value={editModal.item.service?.name ?? 'Sin servicio'} readOnly />
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Nueva fecha y hora" required>
                    <Input name="startDateTime" type="datetime-local" defaultValue={toDateTimeLocal(editModal.item.startDateTime)} />
                  </FormField>
                  <FormField label="Estado" required>
                    <Select name="status" defaultValue={editModal.item.status}>
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmada</option>
                      <option value="completed">Completada</option>
                      <option value="cancelled">Cancelada</option>
                      <option value="no_show">No asistió</option>
                    </Select>
                  </FormField>
                </div>
                <FormField label="Método de pago" required>
                  <Select name="paymentMethod" defaultValue={editModal.item.paymentMethod ?? ''}>
                    <option value="">Mantener actual</option>
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="payphone">Payphone</option>
                  </Select>
                </FormField>
                <FormField label="Notas del cliente">
                  <Textarea name="notes" defaultValue={editModal.item.notes ?? ''} />
                </FormField>
                <FormField label="Notas internas">
                  <Textarea name="internalNotes" defaultValue={editModal.item.internalNotes ?? ''} />
                </FormField>
              </>
            ) : null}

            {editModal.type === 'customer' ? (
              <>
                <FormField label="Nombre" required>
                  <Input name="fullName" defaultValue={editModal.item.fullName} />
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Identificación">
                    <Input name="identification" defaultValue={editModal.item.identification ?? ''} />
                  </FormField>
                  <FormField label="Correo">
                    <Input name="email" defaultValue={editModal.item.email} />
                  </FormField>
                  <FormField label="Teléfono">
                    <Input name="phone" defaultValue={editModal.item.phone} />
                  </FormField>
                </div>
                <FormField label="Notas">
                  <Textarea name="notes" defaultValue={editModal.item.notes ?? ''} />
                </FormField>
              </>
            ) : null}

            <div className="flex justify-end gap-3">
              {editModal.type === 'domain' ? (
                <Button
                  type="button"
                  variant="danger"
                  isLoading={savingKey === `delete-domain-${editModal.item.id}`}
                  loadingLabel="Eliminando..."
                  onClick={onDelete}
                >
                  Eliminar
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={savingKey === `edit-${editModal.type}-${editModal.item.id}`}>
                Guardar cambios
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(generatedPassword)}
        onClose={onCloseGeneratedPassword}
        title="Contraseña temporal generada"
      >
        {generatedPassword ? (
          <div className="space-y-4">
            <Alert variant="info">Guarda esta contraseña y compártela solo con el administrador de la empresa.</Alert>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900">
              {generatedPassword}
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={onCloseGeneratedPassword}>Cerrar</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
