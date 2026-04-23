import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AppointmentAvailabilitySlot } from '../../../lib/api';
import { Alert } from '../../../shared/components/ui/Alert';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { Select } from '../../../shared/components/ui/Select';
import { Checkbox } from '../../../shared/components/ui/Checkbox';
import { Toggle } from '../../../shared/components/ui/Toggle';
import { FormField } from '../../../shared/components/forms/FormField';
import { Modal } from '../../../shared/components/modal/Modal';
import { ImagePreview } from '../../../shared/components/ui/ImagePreview';
import { cn } from '../../../shared/utils/cn';

type PlatformTenantRecord = { id: string; name: string; slug: string; status: string; plan: string };
type PlatformPlanRecord = { id: string; code: string; name: string };
type TenantRoleRecord = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
  isActive: boolean;
  permissions: string[];
};
type TenantMembershipRecord = {
  id: string;
  role: string;
  roleId?: string | null;
  linkedStaffId?: string | null;
  roleName?: string | null;
  isActive: boolean;
  user?: { fullName?: string; email?: string };
};
type DomainRecord = { id: string; domain: string; type: string; verificationStatus: string; isPrimary: boolean };
type ServiceRecord = { id: string; name: string; description: string; durationMinutes: number; price?: number | null; category?: string | null; isActive: boolean; imageUrl?: string | null };
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
type SectionRecord = {
  id: string;
  scope?: 'global' | 'page';
  pageId?: string | null;
  type: string;
  variant: string;
  position: number;
  isVisible: boolean;
  content: Record<string, unknown>;
};
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
  service?: { id?: string; name?: string } | null;
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
  /** Profesionales del tenant para vincular usuarios con rol Staff. */
  staffLinkOptions?: Array<{ id: string; name: string }>;
  planOptions?: PlatformPlanRecord[];
  rolePermissionGroups?: Array<{
    module: string;
    label: string;
    permissions: string[];
  }>;
  sectionTypeOptions?: Array<{ value: string; label: string; description?: string }>;
  services?: Array<{ id: string; name: string }>;
  staffOptions?: Array<{ id: string; name: string }>;
  appointmentRescheduleEnabled?: boolean;
  onAppointmentRescheduleEnabledChange?: (checked: boolean) => void;
  appointmentDate?: string;
  onAppointmentDateChange?: (value: string) => void;
  appointmentSlots?: AppointmentAvailabilitySlot[];
  appointmentSlot?: string;
  onAppointmentSlotChange?: (value: string) => void;
  appointmentAvailabilityLoading?: boolean;
  appointmentAvailabilityMessage?: string | null;
  /** Si se define, edición de reglas/bloqueos de agenda queda fijada a ese profesional (rol staff en consola). */
  lockAgendaStaffId?: string | null;
  onUploadServiceImage?: (service: ServiceRecord, file: File) => Promise<void>;
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
  staffLinkOptions = [],
  planOptions = [],
  rolePermissionGroups = [],
  sectionTypeOptions = [],
  services = [],
  staffOptions = [],
  appointmentRescheduleEnabled = false,
  onAppointmentRescheduleEnabledChange,
  appointmentDate = '',
  onAppointmentDateChange,
  appointmentSlots = [],
  appointmentSlot = '',
  onAppointmentSlotChange,
  appointmentAvailabilityLoading = false,
  appointmentAvailabilityMessage = null,
  lockAgendaStaffId = null,
  onUploadServiceImage,
}: EditEntityModalProps) {
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
  const [sectionAssets, setSectionAssets] = useState<SectionAssetRecord[]>([]);
  const [customHtmlSource, setCustomHtmlSource] = useState('');
  const [customCssSource, setCustomCssSource] = useState('');
  const [customHtmlPreviewViewport, setCustomHtmlPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [appointmentStatus, setAppointmentStatus] = useState<AppointmentRecord['status']>('pending');
  const isCustomHtmlSection = editModal?.type === 'section' && editModal.item.type === 'custom_html';
  const isSystemTenantRole = editModal?.type === 'role' && Boolean(editModal.item.isSystem);

  useEffect(() => {
    if (editModal?.type === 'section' && editModal.item.type === 'custom_html') {
      setSectionAssets(
        Array.isArray(editModal.item.content.assets)
          ? (editModal.item.content.assets as SectionAssetRecord[])
          : [],
      );
      setCustomHtmlSource(String(editModal.item.content.html ?? ''));
      setCustomCssSource(String(editModal.item.content.css ?? ''));
      setCustomHtmlPreviewViewport('desktop');
      return;
    }

    setSectionAssets([]);
    setCustomHtmlSource('');
    setCustomCssSource('');
    setCustomHtmlPreviewViewport('desktop');
  }, [editModal]);

  useEffect(() => {
    if (editModal?.type === 'appointment') {
      setAppointmentStatus(editModal.item.status);
      return;
    }

    setAppointmentStatus('pending');
  }, [editModal]);

  useEffect(() => {
    if (
      editModal?.type === 'appointment'
      && (appointmentStatus === 'cancelled' || appointmentStatus === 'completed')
      && appointmentRescheduleEnabled
    ) {
      onAppointmentRescheduleEnabledChange?.(false);
    }
  }, [appointmentRescheduleEnabled, appointmentStatus, editModal, onAppointmentRescheduleEnabledChange]);

  const requiredAssetAliases = useMemo(
    () => Array.from(
      customHtmlSource.matchAll(/\{\{\s*asset:([a-zA-Z0-9._-]+)\s*\}\}/g),
      (match) => match[1],
    ).filter((value, index, values) => values.indexOf(value) === index),
    [customHtmlSource],
  );
  const missingAssetAliases = useMemo(
    () => requiredAssetAliases.filter((alias) => !sectionAssets.some(
      (asset) => normalizeAssetAlias(asset.name) === normalizeAssetAlias(alias),
    )),
    [requiredAssetAliases, sectionAssets],
  );
  const customHtmlPreviewDocument = useMemo(
    () => buildCustomHtmlPreviewDocument({
      html: customHtmlSource,
      css: customCssSource,
      assets: sectionAssets,
      sectionLabel: editModal?.type === 'section'
        ? `${editModal.item.scope === 'global' ? 'Global' : 'Page'} custom block`
        : 'Custom block',
    }),
    [customCssSource, customHtmlSource, editModal, sectionAssets],
  );

  const membershipRoleSelectValue = useMemo(() => {
    if (editModal?.type !== 'membership') {
      return '';
    }
    const { item } = editModal;
    return (
      item.roleId
      ?? tenantRoles.find((role) => role.code === item.role)?.id
      ?? tenantRoles[0]?.id
      ?? ''
    );
  }, [editModal, tenantRoles]);

  return (
    <>
      <Modal
        open={Boolean(editModal)}
        onClose={onClose}
        maxWidthClassName={isCustomHtmlSection ? 'max-w-[min(96vw,1680px)]' : 'max-w-4xl'}
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
          : editModal?.type === 'appointment' ? 'Gestionar reserva'
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
                  <Select
                    key={`${editModal.item.id}-${membershipRoleSelectValue}-${tenantRoles.map((r) => r.id).join(',')}`}
                    name="roleId"
                    defaultValue={membershipRoleSelectValue}
                    disabled={tenantRoles.length === 0}
                  >
                    {tenantRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Profesional vinculado (obligatorio si el rol es Staff)">
                  <Select
                    key={`${editModal.item.id}-linked-${editModal.item.linkedStaffId ?? ''}`}
                    name="linkedStaffId"
                    defaultValue={editModal.item.linkedStaffId ?? ''}
                    disabled={staffLinkOptions.length === 0}
                  >
                    <option value="">—</option>
                    {staffLinkOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
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
                {isSystemTenantRole ? (
                  <Alert variant="info">
                    Este es un rol de sistema con permisos fijos. Puedes verlo, pero no modificarlo desde el panel.
                  </Alert>
                ) : null}
                <FormField label="Nombre" required>
                  <Input name="name" defaultValue={editModal.item.name} disabled={isSystemTenantRole} />
                </FormField>
                <FormField label="Descripción">
                  <Textarea name="description" defaultValue={editModal.item.description ?? ''} disabled={isSystemTenantRole} />
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
                              disabled={isSystemTenantRole}
                            />
                            {permission}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Checkbox type="checkbox" name="isActive" defaultChecked={editModal.item.isActive} disabled={isSystemTenantRole} /> Activo
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
                <div className="flex items-start gap-4">
                  <ImagePreview
                    src={editModal.item.imageUrl ?? undefined}
                    alt={editModal.item.name}
                    label="Imagen del servicio"
                    className="h-28 w-28 shrink-0"
                    imgClassName="h-full w-full object-cover"
                  />
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-sm font-medium text-slate-700">Imagen del servicio</span>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingServiceImage}
                        onChange={async (e) => {
                          const file = e.currentTarget.files?.[0];
                          if (!file || !onUploadServiceImage) return;
                          e.currentTarget.value = '';
                          setUploadingServiceImage(true);
                          try {
                            await onUploadServiceImage(editModal.item, file);
                          } finally {
                            setUploadingServiceImage(false);
                          }
                        }}
                      />
                      {uploadingServiceImage ? 'Subiendo...' : 'Subir imagen'}
                    </label>
                    <span className="text-xs text-slate-400">JPG, PNG o WebP recomendado</span>
                  </div>
                </div>
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
                  <Select
                    name="staffId"
                    defaultValue={lockAgendaStaffId ?? editModal.item.staffId ?? ''}
                    disabled={Boolean(lockAgendaStaffId)}
                  >
                    {!lockAgendaStaffId ? <option value="">Todos / general</option> : null}
                    {(lockAgendaStaffId
                      ? staffOptions.filter((s) => s.id === lockAgendaStaffId)
                      : staffOptions
                    ).map((staff) => (
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
                  <Select
                    name="staffId"
                    defaultValue={lockAgendaStaffId ?? editModal.item.staffId ?? ''}
                    disabled={Boolean(lockAgendaStaffId)}
                  >
                    {!lockAgendaStaffId ? <option value="">Todos / general</option> : null}
                    {(lockAgendaStaffId
                      ? staffOptions.filter((s) => s.id === lockAgendaStaffId)
                      : staffOptions
                    ).map((staff) => (
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
                      lang="en-GB"
                      defaultValue={editModal.item.startDateTime.slice(0, 16)}
                    />
                  </FormField>
                  <FormField label="Fin">
                    <Input
                      name="endDateTime"
                      type="datetime-local"
                      lang="en-GB"
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
              isCustomHtmlSection ? (
                <>
                  <Card className="grid gap-4 border-slate-200 bg-slate-50/70 shadow-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">Datos de la sección</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Campos base del bloque. Mantén estos datos estables mientras editas el HTML y el CSS.
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {editModal.item.scope === 'global' ? 'Bloque global' : 'Bloque de página'}
                      </span>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-5">
                      <FormField label="ID de sección">
                        <Input value={editModal.item.id} readOnly />
                      </FormField>
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
                      <div className="grid gap-4">
                        <FormField label="Alcance">
                          <Input value={editModal.item.scope === 'global' ? 'Global' : 'Página'} readOnly />
                        </FormField>
                        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <Checkbox type="checkbox" name="isVisible" defaultChecked={editModal.item.isVisible} /> Visible
                        </label>
                      </div>
                    </div>
                    {editModal.item.scope === 'page' && editModal.item.pageId ? (
                      <div className="grid gap-3 md:max-w-md">
                        <FormField label="ID de página">
                          <Input value={editModal.item.pageId} readOnly />
                        </FormField>
                      </div>
                    ) : null}
                  </Card>

                  <Card className="grid gap-5 border-slate-200 shadow-none">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">Editor de código</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          La vista previa se actualiza dentro de un shell aislado del sitio y resuelve los placeholders de assets automáticamente.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          HTML {countEditorLines(customHtmlSource)} líneas
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">
                          CSS {countEditorLines(customCssSource)} líneas
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <Card className="grid gap-3 border border-slate-200 bg-slate-50/60 p-4 shadow-none">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h5 className="text-sm font-semibold text-slate-900">HTML</h5>
                            <p className="mt-1 text-xs text-slate-500">
                              Soporta markup enriquecido y placeholders como <span className="font-mono">{'{{asset:hero-main}}'}</span>.
                            </p>
                          </div>
                        </div>
                        <Textarea
                          name="html"
                          value={customHtmlSource}
                          onChange={(event) => setCustomHtmlSource(event.target.value)}
                          className="min-h-[420px] bg-white font-mono text-xs leading-6"
                        />
                      </Card>
                      <Card className="grid gap-3 border border-slate-200 bg-slate-50/60 p-4 shadow-none">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h5 className="text-sm font-semibold text-slate-900">CSS</h5>
                            <p className="mt-1 text-xs text-slate-500">
                              Los selectores con scope usando <span className="font-mono">&amp;</span> se expanden automáticamente en la vista previa.
                            </p>
                          </div>
                        </div>
                        <Textarea
                          name="css"
                          value={customCssSource}
                          onChange={(event) => setCustomCssSource(event.target.value)}
                          className="min-h-[420px] bg-white font-mono text-xs leading-6"
                        />
                      </Card>
                    </div>
                  </Card>

                  <Card className="grid gap-4 border-slate-200 shadow-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">Vista previa</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Renderiza únicamente el bloque actual, con sus assets y estilos aplicados.
                        </p>
                      </div>
                      <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Viewport de vista previa">
                        {(['desktop', 'tablet', 'mobile'] as const).map((viewport) => (
                          <button
                            key={viewport}
                            type="button"
                            aria-pressed={customHtmlPreviewViewport === viewport}
                            className={cn(
                              'rounded-full px-4 py-2 text-sm font-medium transition',
                              customHtmlPreviewViewport === viewport
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:text-slate-900',
                            )}
                            onClick={() => setCustomHtmlPreviewViewport(viewport)}
                          >
                            {viewport === 'desktop' ? 'Escritorio' : viewport === 'tablet' ? 'Tablet' : 'Móvil'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {missingAssetAliases.length > 0 ? (
                      <Alert variant="error">
                        Faltan assets en la vista previa: {missingAssetAliases.join(', ')}. Se muestran placeholders hasta que esos recursos sean asignados.
                      </Alert>
                    ) : (
                      <Alert variant="info">
                        La vista previa se actualiza en vivo mientras editas. Solo se renderiza este bloque.
                      </Alert>
                    )}
                    <div className="overflow-auto rounded-[1.75rem] border border-slate-200 bg-slate-100/80 p-4">
                      <div
                        className="mx-auto overflow-hidden rounded-[1.4rem] border border-slate-300 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.12)] transition-all duration-200"
                        style={getPreviewViewportStyle(customHtmlPreviewViewport)}
                      >
                        <iframe
                          title="Vista previa de sección custom HTML"
                          sandbox=""
                          srcDoc={customHtmlPreviewDocument}
                          className="h-[720px] w-full border-0 bg-white"
                        />
                      </div>
                    </div>
                  </Card>

                  <input type="hidden" name="assetsJson" value={JSON.stringify(sectionAssets)} readOnly />

                  <Card className="grid gap-4 border-slate-200 bg-slate-50/70 shadow-none">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">Assets requeridos</h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Se detectan automáticamente desde los placeholders <span className="font-mono">{'{{asset:...}}'}</span> en el editor HTML.
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        {requiredAssetAliases.length} requeridos
                      </span>
                    </div>
                    {requiredAssetAliases.length > 0 ? (
                      <div className="grid gap-2">
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
                                    : 'No existe un recurso cargado mapeado a este alias'}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  'rounded-full px-3 py-1 text-xs font-semibold',
                                  matchedAsset
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
                                )}
                              >
                                {matchedAsset ? 'Listo' : 'Falta recurso'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                        Este bloque todavía no usa placeholders de assets. Agrega referencias como <span className="font-mono">{'{{asset:hero-main}}'}</span> y aparecerán aquí.
                      </div>
                    )}
                  </Card>

                  <Card className="grid gap-4 border-slate-200 shadow-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">Librería de recursos</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Administra aliases, labels y texto alternativo para los recursos usados por este bloque.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {sectionAssets.length} recurso{sectionAssets.length === 1 ? '' : 's'}
                      </span>
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
                        Esta sección todavía no tiene assets visuales. Súbelos desde el listado de secciones y luego usa aquí sus placeholders.
                      </div>
                    )}
                  </Card>
                </>
              ) : (
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
              )
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
                <FormField label="Horario actual">
                  <Input value={toDateTimeLocal(editModal.item.startDateTime).replace('T', ' ')} readOnly />
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Estado" required>
                    <Select
                      name="status"
                      value={appointmentStatus}
                      onChange={(event) => setAppointmentStatus(event.target.value as AppointmentRecord['status'])}
                      disabled={editModal.item.status === 'completed'}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmada</option>
                      <option value="completed">Completada</option>
                      <option value="cancelled">Cancelada</option>
                      <option value="no_show">No asistió</option>
                    </Select>
                  </FormField>
                </div>
                {editModal.item.status === 'completed' ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Esta reserva ya está completada y su estado no puede cambiarse.
                  </p>
                ) : appointmentStatus === 'cancelled' ? (
                  <Alert variant="info">
                    Al cancelar la reserva se libera el horario actual. No necesitas seleccionar una nueva fecha.
                  </Alert>
                ) : (
                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <Toggle
                      checked={appointmentRescheduleEnabled}
                      onCheckedChange={onAppointmentRescheduleEnabledChange}
                      label="Reagendar reserva"
                      description="Consulta la agenda del profesional y elige un horario disponible antes de guardar."
                    />
                    {appointmentRescheduleEnabled ? (
                      <>
                        <FormField label="Nueva fecha" required>
                          <Input
                            name="appointmentDate"
                            type="date"
                            value={appointmentDate}
                            onChange={(event) => onAppointmentDateChange?.(event.target.value)}
                            required={appointmentRescheduleEnabled}
                          />
                        </FormField>
                        {appointmentAvailabilityLoading ? (
                          <Alert variant="info">Consultando horarios disponibles...</Alert>
                        ) : null}
                        {appointmentAvailabilityMessage ? (
                          <Alert variant="info">{appointmentAvailabilityMessage}</Alert>
                        ) : null}
                        {appointmentSlots.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {appointmentSlots.map((slot) => {
                              const slotValue = getAppointmentSlotValue(slot);
                              const isSelected = appointmentSlot === slotValue;
                              const isDisabled = !slot.available;

                              return (
                                <label
                                  key={slotValue}
                                  className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                                    isDisabled
                                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                      : isSelected
                                        ? 'cursor-pointer border-[var(--brand-navy)] bg-[rgba(0,64,145,0.06)]'
                                        : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="appointmentSlot"
                                    value={slotValue}
                                    checked={isSelected}
                                    disabled={isDisabled}
                                    onChange={(event) => onAppointmentSlotChange?.(event.target.value)}
                                  />
                                  <div>
                                    <p className={`font-medium ${isDisabled ? 'text-slate-500' : 'text-slate-900'}`}>
                                      {formatAvailabilityDateTime(slot.start)}
                                    </p>
                                    <p className={`text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {slot.staffName ?? editModal.item.staff?.name ?? 'Profesional disponible'}
                                    </p>
                                    {isDisabled && slot.unavailableReason ? (
                                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                                        {slot.unavailableReason}
                                      </p>
                                    ) : null}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <Alert variant="info">
                        Activa esta opción solo si vas a mover la reserva a otro horario.
                      </Alert>
                    )}
                  </div>
                )}
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
              <Button
                type="submit"
                isLoading={savingKey === `edit-${editModal.type}-${editModal.item.id}`}
                disabled={
                  (editModal.type === 'appointment' && appointmentRescheduleEnabled && !appointmentSlot)
                  || isSystemTenantRole
                }
              >
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

function formatAvailabilityDateTime(value: string) {
  return new Date(value).toLocaleString('es-EC', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getAppointmentSlotValue(slot: AppointmentAvailabilitySlot) {
  return `${slot.start}::${slot.staffId ?? 'unassigned'}`;
}

function countEditorLines(value: string) {
  if (!value.trim()) {
    return 0;
  }

  return value.replace(/\r\n/g, '\n').split('\n').length;
}

function getPreviewViewportStyle(viewport: 'desktop' | 'tablet' | 'mobile') {
  if (viewport === 'mobile') {
    return { width: '390px', maxWidth: '100%' };
  }

  if (viewport === 'tablet') {
    return { width: '820px', maxWidth: '100%' };
  }

  return { width: '100%', maxWidth: '1280px' };
}

function buildCustomHtmlPreviewDocument(input: {
  html: string;
  css: string;
  assets: SectionAssetRecord[];
  sectionLabel: string;
}) {
  const resolvedHtml = resolveCustomHtmlPreviewAssets(input.html, input.assets).trim() || [
    '<section class="preview-empty-state">',
    '  <p>Aún no hay contenido HTML.</p>',
    '  <span>Empieza a escribir en el editor para renderizar el bloque aquí.</span>',
    '</section>',
  ].join('');
  const scopedCss = scopeCustomHtmlPreviewCss(input.css).replace(/<\/style/gi, '<\\/style');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <title>${escapePreviewText(input.sectionLabel)}</title>`,
    '    <style>',
    '      :root {',
    '        color-scheme: light;',
    '        --preview-bg: #f4f6fb;',
    '        --preview-surface: rgba(255, 255, 255, 0.92);',
    '        --preview-border: rgba(148, 163, 184, 0.32);',
    '        --preview-ink: #0f172a;',
    '        --preview-muted: #526075;',
    '        --preview-brand: #0f4c81;',
    '        --preview-soft: #dbeafe;',
    '        --preview-shadow: 0 32px 80px rgba(15, 23, 42, 0.12);',
    '      }',
    '      * { box-sizing: border-box; }',
    '      html, body { margin: 0; min-height: 100%; }',
    '      body {',
    "        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;",
    '        background:',
    '          radial-gradient(circle at top, rgba(207, 230, 255, 0.95), transparent 34%),',
    '          linear-gradient(180deg, #f8fbff 0%, var(--preview-bg) 100%);',
    '        color: var(--preview-ink);',
    '      }',
    '      img { display: block; max-width: 100%; }',
    '      a { color: inherit; }',
    '      .preview-canvas {',
    '        min-height: 100vh;',
    '        padding: 24px;',
    '      }',
    '      [data-custom-html-preview] {',
    '        position: relative;',
    '        min-height: 320px;',
    '      }',
    '      .preview-empty-state {',
        '        min-height: 260px;',
        '        display: grid;',
        '        place-items: center;',
    '        gap: 8px;',
    '        border: 1px dashed rgba(148, 163, 184, 0.45);',
    '        border-radius: 24px;',
    '        background: linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.88));',
        '        text-align: center;',
        '        color: var(--preview-muted);',
        '        padding: 24px;',
      '      }',
      '      .preview-empty-state p { margin: 0; font-size: 1rem; font-weight: 600; color: var(--preview-ink); }',
      '      .preview-empty-state span { font-size: 0.92rem; }',
    '      @media (max-width: 720px) {',
    '        .preview-canvas { padding: 14px; }',
    '      }',
    `      ${scopedCss}`,
    '    </style>',
    '  </head>',
    '  <body>',
    '    <div class="preview-canvas">',
    `      <div data-custom-html-preview aria-label="${escapePreviewText(input.sectionLabel)}">${resolvedHtml}</div>`,
    '    </div>',
    '  </body>',
    '</html>',
  ].join('\n');
}

function scopeCustomHtmlPreviewCss(css: string) {
  return css.replace(/&/g, '[data-custom-html-preview]');
}

function resolveCustomHtmlPreviewAssets(html: string, assets: SectionAssetRecord[]) {
  return html.replace(/\{\{\s*asset:([a-zA-Z0-9._-]+)\s*\}\}/g, (_match, rawAlias) => {
    const alias = normalizeAssetAlias(String(rawAlias));
    const asset = assets.find((item) => normalizeAssetAlias(item.name) === alias);
    const assetUrl = typeof asset?.url === 'string' && asset.url.trim() ? asset.url.trim() : null;

    return assetUrl ?? buildMissingAssetPreviewDataUri(alias || 'missing-asset');
  });
}

function buildMissingAssetPreviewDataUri(alias: string) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" fill="none">',
    '  <rect width="1200" height="800" rx="48" fill="#E2E8F0" />',
    '  <rect x="44" y="44" width="1112" height="712" rx="34" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="4" stroke-dasharray="16 14" />',
    '  <circle cx="220" cy="240" r="74" fill="#DBEAFE" />',
    '  <path d="M178 554 374 358l146 146 108-108 216 216H178Z" fill="#BFDBFE" />',
    `  <text x="600" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0F172A">${escapeSvgText(alias)}</text>`,
    '  <text x="600" y="340" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#475569">Falta un asset para la vista previa</text>',
    '  <text x="600" y="386" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#64748B">Súbelo o asígnalo en la librería de recursos inferior.</text>',
    '</svg>',
  ].join('');

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapePreviewText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
