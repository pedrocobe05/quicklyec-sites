import { SITE_SECTION_CATALOG } from '@quickly-sites/shared';
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { EditEntityModal, type EditModalState } from '../features/dashboard/components/EditEntityModal';
import { BrandingSettingsSection } from '../features/tenant/components/BrandingSettingsSection';
import { DomainsSection } from '../features/tenant/components/DomainsSection';
import { ServicesStaffSection } from '../features/operations/components/ServicesStaffSection';
import { SiteSection } from '../features/site/components/SiteSection';
import {
  createAvailabilityRule,
  createAppointment,
  createPage,
  createTenantMembership,
  createTenantRole,
  createTenantDomain,
  createScheduleBlock,
  createSection,
  createService,
  createStaff,
  deleteCustomer,
  deleteAvailabilityRule,
  deleteService,
  deleteScheduleBlock,
  deleteStaff,
  deleteTenantFile,
  deleteTenantDomain,
  getAppointments,
  getAppointmentAvailability,
  type AppointmentAvailabilitySlot,
  getAvailabilityRules,
  getCustomers,
  getPages,
  getPlatformPlans,
  getScheduleBlocks,
  getSections,
  getServices,
  getStaff,
  getTenantMemberships,
  getTenantRoles,
  getTenantProfile,
  resetTenantMembershipPassword,
  sendTenantTestEmail,
  updateAppointment,
  updateAppointmentStatus,
  updateAvailabilityRule,
  updateCustomer,
  updatePage,
  updatePlatformTenant,
  updateScheduleBlock,
  updateSection,
  updateService,
  updateStaff,
  updateTenantBranding,
  updateTenantMembership,
  updateTenantRole,
  updateTenantSettings,
  reversePayphoneAppointmentPayment,
  uploadTenantFile,
} from '../lib/api';
import { Modal } from '../shared/components/modal/Modal';
import { Button } from '../shared/components/ui/Button';
import { Card } from '../shared/components/ui/Card';
import { Checkbox } from '../shared/components/ui/Checkbox';
import { DataTable, DataTablePagination, DataTableShell, DataTableToolbar } from '../shared/components/ui/DataTable';
import { FormField } from '../shared/components/forms/FormField';
import { Input } from '../shared/components/ui/Input';
import { Select } from '../shared/components/ui/Select';
import { Textarea } from '../shared/components/ui/Textarea';
import { Skeleton } from '../shared/components/ui/Skeleton';
import { useNotification } from '../shared/notifications/use-notification';

type TenantTab =
  | 'general'
  | 'users'
  | 'roles'
  | 'branding'
  | 'email'
  | 'domains'
  | 'site'
  | 'services'
  | 'staff'
  | 'agenda'
  | 'appointments'
  | 'customers';

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
}

interface TenantProfileResponse {
  tenant: TenantSummary;
  planCapabilities?: {
    modules?: string[];
    features?: string[];
    limits?: Record<string, number | boolean | null>;
  } | null;
  effectiveModules?: string[];
  settings?: {
    locale?: string | null;
    canonicalDomain?: string | null;
    defaultSeoTitle?: string | null;
    defaultSeoDescription?: string | null;
    siteIndexingEnabled?: boolean;
    contactEmail?: string | null;
    contactPhone?: string | null;
    whatsappNumber?: string | null;
    contactAddress?: string | null;
    cashPaymentEnabled?: boolean;
    transferPaymentEnabled?: boolean;
    payphonePaymentEnabled?: boolean;
    payphoneMode?: string | null;
    payphoneStoreId?: string | null;
    payphoneToken?: string | null;
    mailConfig?: {
      host?: string;
      port?: number;
      secure?: boolean;
      user?: string;
      pass?: string;
      fromEmail?: string;
      fromName?: string;
    } | null;
  } | null;
  branding?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    fontFamily?: string | null;
    borderRadius?: string | null;
    buttonStyle?: string | null;
    customCss?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
  } | null;
  domains?: {
    id: string;
    domain: string;
    type: string;
    verificationStatus: string;
    isPrimary: boolean;
  }[];
  effectivePermissions?: string[];
}

interface TenantMembershipRecord {
  id: string;
  roleId?: string | null;
  role: string;
  roleName?: string | null;
  isActive: boolean;
  user?: {
    fullName?: string;
    email?: string;
  };
}

interface TenantRoleRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: string[];
}

interface PlatformPlanRecord {
  id: string;
  code: string;
  name: string;
}

interface PageRecord {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  isPublished: boolean;
  ogImageUrl?: string | null;
  template?: { name: string };
}

interface SectionRecord {
  id: string;
  scope?: 'global' | 'page';
  pageId?: string | null;
  type: string;
  variant: string;
  position: number;
  isVisible: boolean;
  content: Record<string, unknown>;
}

interface SectionAssetRecord {
  name: string;
  url: string;
  fileId?: string | null;
  alt?: string | null;
  label?: string | null;
  kind?: 'image';
}

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
}

interface AvailabilityRuleRecord {
  id: string;
  staffId?: string | null;
  staff?: { id: string; name: string } | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  isActive: boolean;
}

interface ScheduleBlockRecord {
  id: string;
  staffId?: string | null;
  staff?: { id: string; name: string } | null;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  blockType: string;
}

interface AppointmentRecord {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  paymentMethod?: 'cash' | 'transfer' | 'payphone' | null;
  createdAt?: string;
  startDateTime: string;
  notes?: string | null;
  internalNotes?: string | null;
  customer?: { fullName?: string; phone?: string | null } | null;
  service?: { id?: string; name?: string } | null;
  staff?: { id?: string; name?: string } | null;
}

interface CustomerRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  identification?: string | null;
  notes?: string | null;
}

const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const tenantPermissionGroups = [
  {
    module: 'site',
    label: 'Sitio',
    permissions: ['site.view', 'site.update'],
  },
  {
    module: 'branding',
    label: 'Marca',
    permissions: ['branding.view', 'branding.update', 'seo.view', 'seo.update', 'domains.view', 'domains.update', 'settings.view', 'settings.update'],
  },
  {
    module: 'services',
    label: 'Servicios y equipo',
    permissions: ['services.view', 'services.create', 'services.update', 'services.delete', 'staff.view', 'staff.create', 'staff.update', 'staff.delete'],
  },
  {
    module: 'agenda',
    label: 'Agenda y reservas',
    permissions: ['agenda.view', 'agenda.create', 'agenda.update', 'agenda.delete', 'appointments.view', 'appointments.create', 'appointments.update', 'appointments.delete'],
  },
  {
    module: 'customers',
    label: 'Clientes',
    permissions: ['customers.view', 'customers.create', 'customers.update', 'customers.delete'],
  },
  {
    module: 'users',
    label: 'Usuarios y roles',
    permissions: ['users.view', 'users.create', 'users.update', 'users.delete', 'users.reset_password', 'roles.view', 'roles.create', 'roles.update', 'roles.delete'],
  },
  {
    module: 'notifications',
    label: 'Notificaciones y reportes',
    permissions: ['notifications.view', 'reports.view'],
  },
] as const;
function appointmentStatusLabel(status: AppointmentRecord['status']) {
  const labels: Record<AppointmentRecord['status'], string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
    no_show: 'No asistió',
  };

  return labels[status];
}

function appointmentStatusClasses(status: AppointmentRecord['status']) {
  const classes: Record<AppointmentRecord['status'], string> = {
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    no_show: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  };

  return classes[status];
}

function appointmentPaymentMethodLabel(method?: AppointmentRecord['paymentMethod']) {
  const labels: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    payphone: 'Payphone',
    undefined: 'Sin definir',
    null: 'Sin definir',
  };

  return labels[String(method ?? 'undefined')] ?? 'Sin definir';
}

function toIsoDateTime(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Debes indicar una fecha y hora válidas');
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('La fecha y hora ingresadas no son válidas');
  }
  return parsed.toISOString();
}

function formatAvailabilityDateTime(value: string) {
  return new Date(value).toLocaleString('es-EC', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAppointmentSlotValue(slot: AppointmentAvailabilitySlot) {
  return `${slot.start}::${slot.staffId ?? 'unassigned'}`;
}

function parseAppointmentSlotValue(value: string) {
  const [startDateTime, rawStaffId] = value.split('::');
  const staffId = rawStaffId && rawStaffId !== 'unassigned' ? rawStaffId : null;

  return {
    startDateTime: startDateTime?.trim() ?? '',
    staffId,
  };
}

function formatRelativeUpdate(value: Date | null) {
  if (!value) {
    return 'Sin sincronizar todavía';
  }

  const seconds = Math.max(0, Math.round((Date.now() - value.getTime()) / 1000));
  if (seconds < 10) {
    return 'Actualizado hace unos segundos';
  }
  if (seconds < 60) {
    return `Actualizado hace ${seconds}s`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `Actualizado hace ${minutes} min`;
  }

  return `Actualizado ${value.toLocaleString()}`;
}

function normalizeAssetName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function parseSectionAssetsJson(rawValue: FormDataEntryValue | null, fallback: unknown): SectionAssetRecord[] {
  const raw = String(rawValue ?? '').trim();

  if (!raw) {
    return Array.isArray(fallback) ? (fallback as SectionAssetRecord[]) : [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Los assets de la sección deben ser un arreglo JSON válido');
  }

  const assets: SectionAssetRecord[] = [];

  for (const asset of parsed) {
    if (!asset || typeof asset !== 'object') {
      continue;
    }

    const rawAsset = asset as Record<string, unknown>;
    const name = normalizeAssetName(String(rawAsset.name ?? rawAsset.label ?? ''));
    const url = String(rawAsset.url ?? '').trim();

    if (!name || !url) {
      continue;
    }

    assets.push({
      name,
      url,
      fileId: String(rawAsset.fileId ?? '').trim() || null,
      alt: String(rawAsset.alt ?? '').trim() || null,
      label: String(rawAsset.label ?? '').trim() || null,
      kind: 'image',
    });
  }

  return assets;
}

export function TenantDetailPage() {
  const { tenantId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = localStorage.getItem('qs_access_token');
  const user = JSON.parse(localStorage.getItem('qs_user') ?? 'null') as { isPlatformAdmin?: boolean } | null;
  const { notify } = useNotification();
  const [tenantProfile, setTenantProfile] = useState<TenantProfileResponse | null>(null);
  const [tenantMemberships, setTenantMemberships] = useState<TenantMembershipRecord[]>([]);
  const [platformPlans, setPlatformPlans] = useState<PlatformPlanRecord[]>([]);
  const [tenantRoles, setTenantRoles] = useState<TenantRoleRecord[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [globalSections, setGlobalSections] = useState<SectionRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [appointmentsRefreshing, setAppointmentsRefreshing] = useState(false);
  const [appointmentsLastUpdatedAt, setAppointmentsLastUpdatedAt] = useState<Date | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRuleRecord[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlockRecord[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'favicon' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false);
  const [createAppointmentCustomerMode, setCreateAppointmentCustomerMode] = useState<'existing' | 'new'>('existing');
  const [createAppointmentServiceId, setCreateAppointmentServiceId] = useState('');
  const [createAppointmentStaffId, setCreateAppointmentStaffId] = useState('');
  const [createAppointmentDate, setCreateAppointmentDate] = useState('');
  const [createAppointmentSlot, setCreateAppointmentSlot] = useState('');
  const [createAppointmentPaymentMethod, setCreateAppointmentPaymentMethod] = useState<'cash' | 'transfer' | 'payphone'>('cash');
  const [createAppointmentSlots, setCreateAppointmentSlots] = useState<AppointmentAvailabilitySlot[]>([]);
  const [createAppointmentAvailabilityMessage, setCreateAppointmentAvailabilityMessage] = useState<string | null>(null);
  const [createAppointmentAvailabilityLoading, setCreateAppointmentAvailabilityLoading] = useState(false);
  const [editAppointmentRescheduleEnabled, setEditAppointmentRescheduleEnabled] = useState(false);
  const [editAppointmentDate, setEditAppointmentDate] = useState('');
  const [editAppointmentSlot, setEditAppointmentSlot] = useState('');
  const [editAppointmentSlots, setEditAppointmentSlots] = useState<AppointmentAvailabilitySlot[]>([]);
  const [editAppointmentAvailabilityMessage, setEditAppointmentAvailabilityMessage] = useState<string | null>(null);
  const [editAppointmentAvailabilityLoading, setEditAppointmentAvailabilityLoading] = useState(false);
  const [customerView, setCustomerView] = useState<CustomerRecord | null>(null);
  const [rolesSearch, setRolesSearch] = useState('');
  const [rolesPage, setRolesPage] = useState(1);
  const [membershipsSearch, setMembershipsSearch] = useState('');
  const [membershipsPage, setMembershipsPage] = useState(1);
  const [rulesSearch, setRulesSearch] = useState('');
  const [rulesPage, setRulesPage] = useState(1);
  const [rulesStaffFilter, setRulesStaffFilter] = useState('');
  const [blocksSearch, setBlocksSearch] = useState('');
  const [blocksPage, setBlocksPage] = useState(1);
  const [blocksStaffFilter, setBlocksStaffFilter] = useState('');
  const [agendaStaffFilter, setAgendaStaffFilter] = useState('');
  const [appointmentsSearch, setAppointmentsSearch] = useState('');
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsSort, setAppointmentsSort] = useState<'nearest' | 'created_desc'>('nearest');
  const [customersSearch, setCustomersSearch] = useState('');
  const [customersPage, setCustomersPage] = useState(1);
  const createAppointmentAvailabilityLockRef = useRef(false);
  const editAppointmentAvailabilityLockRef = useRef(false);

  const createAppointmentSelectedService = useMemo(
    () => services.find((service) => service.id === createAppointmentServiceId) ?? null,
    [createAppointmentServiceId, services],
  );
  const createAppointmentCompatibleStaff = useMemo(
    () => (
      createAppointmentServiceId
        ? staff.filter((member) => member.serviceIds?.includes(createAppointmentServiceId))
        : []
    ),
    [createAppointmentServiceId, staff],
  );
  const createAppointmentPaymentOptions = useMemo(() => {
    const settings = tenantProfile?.settings;
    return [
      { value: 'cash' as const, label: 'Efectivo', enabled: settings?.cashPaymentEnabled ?? true },
      { value: 'transfer' as const, label: 'Transferencia', enabled: settings?.transferPaymentEnabled ?? false },
      { value: 'payphone' as const, label: 'Payphone', enabled: settings?.payphonePaymentEnabled ?? false },
    ].filter((option) => option.enabled);
  }, [tenantProfile?.settings?.cashPaymentEnabled, tenantProfile?.settings?.transferPaymentEnabled, tenantProfile?.settings?.payphonePaymentEnabled]);

  const activeTab = useMemo<TenantTab>(() => {
    const requested = searchParams.get('tab');
    const validTabs: TenantTab[] = [
      'general',
      'users',
      'roles',
      'branding',
      'email',
      'domains',
      'site',
      'services',
      'staff',
      'agenda',
      'appointments',
      'customers',
    ];
    return validTabs.includes(requested as TenantTab) ? (requested as TenantTab) : 'general';
  }, [searchParams]);

  const currentLayoutPath = useMemo(() => {
    if (user?.isPlatformAdmin) {
      return '/platform/tenants';
    }

    const tabToPath: Record<TenantTab, string> = {
      general: '/settings',
      users: '/settings',
      roles: '/settings',
      branding: '/branding',
      email: '/settings',
      domains: '/domains',
      site: '/site',
      services: '/services',
      staff: '/staff',
      agenda: '/agenda',
      appointments: '/appointments',
      customers: '/customers',
    };

    return tabToPath[activeTab];
  }, [activeTab, user?.isPlatformAdmin]);

  const effectivePermissions = tenantProfile?.effectivePermissions ?? [];
  const can = (permission: string) => Boolean(user?.isPlatformAdmin) || effectivePermissions.includes(permission);
  const canAccessServices = can('services.view');
  const canAccessStaff = can('staff.view');
  const canAccessRestrictedConfiguration = Boolean(user?.isPlatformAdmin);

  const visibleTabs = useMemo(() => {
    return [
      { id: 'general', label: 'General', visible: canAccessRestrictedConfiguration },
      { id: 'users', label: 'Usuarios', visible: can('users.view') },
      { id: 'roles', label: 'Roles', visible: can('roles.view') },
      { id: 'branding', label: 'Marca', visible: can('branding.view') || can('seo.view') || can('settings.view') },
      { id: 'email', label: 'Correo', visible: canAccessRestrictedConfiguration && (can('settings.update') || can('branding.update')) },
      { id: 'domains', label: 'Dominios', visible: canAccessRestrictedConfiguration && can('domains.view') },
      { id: 'site', label: 'Sitio', visible: canAccessRestrictedConfiguration && can('site.view') },
      { id: 'services', label: 'Servicios', visible: can('services.view') },
      { id: 'staff', label: 'Staff', visible: can('staff.view') },
      { id: 'agenda', label: 'Agenda', visible: can('agenda.view') },
      { id: 'appointments', label: 'Reservas', visible: can('appointments.view') },
      { id: 'customers', label: 'Clientes', visible: can('customers.view') },
    ].filter((tab) => tab.visible) as Array<{ id: TenantTab; label: string; visible: boolean }>;
  }, [canAccessRestrictedConfiguration, effectivePermissions, user?.isPlatformAdmin]);
  const showInternalTabSwitcher = Boolean(user?.isPlatformAdmin);

  const tenantRoutePrefix = tenantId ? `/platform/tenants/${tenantId}` : '';

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? pages[0] ?? null,
    [pages, selectedPageId],
  );
  const sectionTypeOptions = useMemo(() => {
    const options = SITE_SECTION_CATALOG
      .filter((section) => section.value !== 'booking_cta')
      .map((section) => ({
        value: section.value,
        label: section.label,
        description: section.description,
      }));

    if (tenantProfile?.planCapabilities?.features?.includes('online_booking')) {
      options.splice(5, 0, {
        value: 'booking_cta',
        label: 'Llamado a reserva',
        description: 'Bloque para invitar a reservar cuando el plan lo permita.',
      });
    }

    return options;
  }, [tenantProfile?.planCapabilities?.features]);

  const tablePageSize = 8;
  const filteredRoles = useMemo(() => {
    const query = rolesSearch.trim().toLowerCase();
    if (!query) return tenantRoles;
    return tenantRoles.filter((role) =>
      [role.name, role.code, role.description ?? ''].some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rolesSearch, tenantRoles]);
  const rolesPageCount = Math.max(1, Math.ceil(filteredRoles.length / tablePageSize));
  const visibleRoles = filteredRoles.slice((Math.min(rolesPage, rolesPageCount) - 1) * tablePageSize, Math.min(rolesPage, rolesPageCount) * tablePageSize);

  const filteredMemberships = useMemo(() => {
    const query = membershipsSearch.trim().toLowerCase();
    if (!query) return tenantMemberships;
    return tenantMemberships.filter((membership) =>
      [
        membership.user?.fullName ?? '',
        membership.user?.email ?? '',
        membership.roleName ?? membership.role,
        membership.isActive ? 'activo' : 'inactivo',
      ].some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [membershipsSearch, tenantMemberships]);
  const membershipsPageCount = Math.max(1, Math.ceil(filteredMemberships.length / tablePageSize));
  const visibleMemberships = filteredMemberships.slice(
    (Math.min(membershipsPage, membershipsPageCount) - 1) * tablePageSize,
    Math.min(membershipsPage, membershipsPageCount) * tablePageSize,
  );

  const filteredRules = useMemo(() => {
    const query = rulesSearch.trim().toLowerCase();
    return availabilityRules.filter((rule) =>
      (!rulesStaffFilter
        ? true
        : rulesStaffFilter === '__general__'
          ? !rule.staffId
          : rule.staffId === rulesStaffFilter)
      && (
        !query
        || [
          rule.staff?.name ?? '',
          days[rule.dayOfWeek],
          rule.startTime,
          rule.endTime,
          String(rule.slotIntervalMinutes),
          rule.isActive ? 'activa' : 'inactiva',
        ].some((value) => String(value).toLowerCase().includes(query))
      )
    );
  }, [availabilityRules, rulesSearch, rulesStaffFilter]);
  const rulesPageCount = Math.max(1, Math.ceil(filteredRules.length / tablePageSize));
  const visibleRules = filteredRules.slice(
    (Math.min(rulesPage, rulesPageCount) - 1) * tablePageSize,
    Math.min(rulesPage, rulesPageCount) * tablePageSize,
  );

  const filteredBlocks = useMemo(() => {
    const query = blocksSearch.trim().toLowerCase();
    return scheduleBlocks.filter((block) =>
      (!blocksStaffFilter
        ? true
        : blocksStaffFilter === '__general__'
          ? !block.staffId
          : block.staffId === blocksStaffFilter)
      && (
        !query
        || [
          block.staff?.name ?? '',
          block.reason,
          block.blockType,
          new Date(block.startDateTime).toLocaleString(),
          new Date(block.endDateTime).toLocaleString(),
        ].some((value) => String(value).toLowerCase().includes(query))
      )
    );
  }, [blocksSearch, scheduleBlocks, blocksStaffFilter]);
  const blocksPageCount = Math.max(1, Math.ceil(filteredBlocks.length / tablePageSize));
  const visibleBlocks = filteredBlocks.slice(
    (Math.min(blocksPage, blocksPageCount) - 1) * tablePageSize,
    Math.min(blocksPage, blocksPageCount) * tablePageSize,
  );

  const filteredAppointments = useMemo(() => {
    const query = appointmentsSearch.trim().toLowerCase();
    const matchingAppointments = !query
      ? appointments
      : appointments.filter((appointment) =>
      [
        appointment.customer?.fullName ?? '',
        appointment.service?.name ?? '',
        appointment.staff?.name ?? '',
        appointmentStatusLabel(appointment.status),
        appointmentPaymentMethodLabel(appointment.paymentMethod),
        appointment.notes ?? '',
        appointment.createdAt ? new Date(appointment.createdAt).toLocaleString() : '',
        new Date(appointment.startDateTime).toLocaleString(),
      ].some((value) => String(value).toLowerCase().includes(query)),
    );

    return [...matchingAppointments].sort((left, right) => {
      if (appointmentsSort === 'created_desc') {
        const leftCreated = new Date(left.createdAt ?? 0).getTime();
        const rightCreated = new Date(right.createdAt ?? 0).getTime();
        return rightCreated - leftCreated || new Date(left.startDateTime).getTime() - new Date(right.startDateTime).getTime();
      }

      const leftStart = new Date(left.startDateTime).getTime();
      const rightStart = new Date(right.startDateTime).getTime();
      return leftStart - rightStart || new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    });
  }, [appointments, appointmentsSearch, appointmentsSort]);
  const appointmentsPageCount = Math.max(1, Math.ceil(filteredAppointments.length / tablePageSize));
  const visibleAppointments = filteredAppointments.slice(
    (Math.min(appointmentsPage, appointmentsPageCount) - 1) * tablePageSize,
    Math.min(appointmentsPage, appointmentsPageCount) * tablePageSize,
  );

  const filteredCustomers = useMemo(() => {
    const query = customersSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.fullName, customer.email, customer.phone, customer.identification ?? ''].some((value) =>
        String(value).toLowerCase().includes(query),
      ),
    );
  }, [customers, customersSearch]);
  const customersPageCount = Math.max(1, Math.ceil(filteredCustomers.length / tablePageSize));
  const visibleCustomers = filteredCustomers.slice(
    (Math.min(customersPage, customersPageCount) - 1) * tablePageSize,
    Math.min(customersPage, customersPageCount) * tablePageSize,
  );

  useEffect(() => {
    setRolesPage(1);
  }, [rolesSearch]);

  useEffect(() => {
    setMembershipsPage(1);
  }, [membershipsSearch]);

  useEffect(() => {
    setRulesPage(1);
  }, [rulesSearch, rulesStaffFilter]);

  useEffect(() => {
    setBlocksPage(1);
  }, [blocksSearch, blocksStaffFilter]);

  useEffect(() => {
    setRulesStaffFilter(agendaStaffFilter);
    setBlocksStaffFilter(agendaStaffFilter);
  }, [agendaStaffFilter]);

  useEffect(() => {
    setAppointmentsPage(1);
  }, [appointmentsSearch, appointmentsSort]);

  useEffect(() => {
    setCustomersPage(1);
  }, [customersSearch]);

  function changeTab(nextTab: TenantTab) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'general') nextParams.delete('tab');
    else nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
  }

  async function loadData() {
    if (!token || !tenantId) return;
    const tenantData = (await getTenantProfile(token, tenantId)) as TenantProfileResponse;
    const [
      membershipsData,
      rolesData,
      pagesData,
      globalSectionsData,
      servicesData,
      staffData,
      appointmentsData,
      customersData,
      rulesData,
      blocksData,
    ] = await Promise.all([
      getTenantMemberships(token, tenantId),
      getTenantRoles(token, tenantId),
      getPages(token, tenantId),
      getSections(token, tenantId, undefined, 'global'),
      getServices(token, tenantId),
      getStaff(token, tenantId),
      getAppointments(token, tenantId),
      getCustomers(token, tenantId),
      getAvailabilityRules(token, tenantId),
      getScheduleBlocks(token, tenantId),
    ]);
    const plansData = user?.isPlatformAdmin ? await getPlatformPlans(token) : [];

    const typedPages = pagesData as PageRecord[];
    const nextPageId = selectedPageId || typedPages[0]?.id;
    setTenantProfile(tenantData);
    setPlatformPlans(plansData as PlatformPlanRecord[]);
    setTenantMemberships(
      (membershipsData as Array<{
        id: string;
        roleId?: string | null;
        role?: string;
        roleDefinition?: { id: string; code: string; name: string } | null;
        isActive: boolean;
        user?: { fullName?: string; email?: string };
      }>).map((membership) => ({
        id: membership.id,
        roleId: membership.roleId ?? membership.roleDefinition?.id ?? null,
        role: membership.roleDefinition?.code ?? membership.role ?? '',
        roleName: membership.roleDefinition?.name ?? membership.role ?? '',
        isActive: membership.isActive,
        user: membership.user,
      })),
    );
    setTenantRoles(rolesData as TenantRoleRecord[]);
    setPages(typedPages);
    setGlobalSections(globalSectionsData as SectionRecord[]);
    setServices(servicesData as ServiceRecord[]);
    setStaff(
      (staffData as Array<StaffRecord & { staffServices?: Array<{ serviceId: string; service?: { name?: string | null } | null }> }>).map((member) => ({
        ...member,
        serviceIds: member.staffServices?.map((link) => link.serviceId) ?? [],
        serviceNames: member.staffServices?.map((link) => link.service?.name ?? '').filter(Boolean) ?? [],
      })),
    );
    setAppointments(appointmentsData as AppointmentRecord[]);
    setAppointmentsLastUpdatedAt(new Date());
    setCustomers(customersData as CustomerRecord[]);
    setAvailabilityRules(rulesData as AvailabilityRuleRecord[]);
    setScheduleBlocks(blocksData as ScheduleBlockRecord[]);

    if (nextPageId) {
      setSelectedPageId(nextPageId);
      const sectionsData = await getSections(token, tenantId, nextPageId);
      setSections(sectionsData as SectionRecord[]);
    } else {
      setSections([]);
    }
  }

  async function refreshAppointments(options?: { silent?: boolean }) {
    if (!token || !tenantId) return;

    if (!options?.silent) {
      setAppointmentsRefreshing(true);
    }

    try {
      const appointmentsData = await getAppointments(token, tenantId);
      setAppointments(appointmentsData as AppointmentRecord[]);
      setAppointmentsLastUpdatedAt(new Date());
    } catch (err) {
      if (!options?.silent) {
        notify((err as Error).message, 'error');
      }
    } finally {
      if (!options?.silent) {
        setAppointmentsRefreshing(false);
      }
    }
  }

  async function loadCreateAppointmentAvailability(nextDate = createAppointmentDate, nextServiceId = createAppointmentServiceId, nextStaffId = createAppointmentStaffId) {
    if (createAppointmentAvailabilityLockRef.current) {
      return;
    }

    if (!token || !tenantId) {
      return;
    }

    if (!nextServiceId || !nextDate) {
      setCreateAppointmentAvailabilityMessage('Selecciona un servicio y una fecha para consultar la disponibilidad.');
      setCreateAppointmentSlots([]);
      setCreateAppointmentSlot('');
      return;
    }

    try {
      createAppointmentAvailabilityLockRef.current = true;
      setCreateAppointmentAvailabilityLoading(true);
      const nextSlots = await getAppointmentAvailability(
        token,
        tenantId,
        nextServiceId,
        nextDate,
        nextStaffId || undefined,
      );
      setCreateAppointmentSlots(nextSlots);
      setCreateAppointmentSlot('');
      setCreateAppointmentAvailabilityMessage(
        nextSlots.some((slot) => slot.available)
          ? null
          : 'No hay horarios disponibles para esa fecha. Prueba con otro día o profesional.',
      );
    } catch (err) {
      setCreateAppointmentSlots([]);
      setCreateAppointmentSlot('');
      setCreateAppointmentAvailabilityMessage(null);
      const message = err instanceof Error ? err.message : 'No se pudo consultar la disponibilidad.';
      notify(message, 'error');
    } finally {
      createAppointmentAvailabilityLockRef.current = false;
      setCreateAppointmentAvailabilityLoading(false);
    }
  }

  function clearEditAppointmentAvailability(options?: { preserveDate?: boolean }) {
    editAppointmentAvailabilityLockRef.current = false;
    setEditAppointmentSlots([]);
    setEditAppointmentSlot('');
    setEditAppointmentAvailabilityMessage(null);
    setEditAppointmentAvailabilityLoading(false);

    if (!options?.preserveDate) {
      setEditAppointmentDate('');
    }
  }

  function handleEditAppointmentRescheduleChange(checked: boolean) {
    setEditAppointmentRescheduleEnabled(checked);

    if (!checked) {
      clearEditAppointmentAvailability({ preserveDate: true });
    }
  }

  async function loadEditAppointmentAvailability(nextDate = editAppointmentDate) {
    if (editAppointmentAvailabilityLockRef.current) {
      return;
    }

    if (!token || !tenantId || editModal?.type !== 'appointment') {
      return;
    }

    const serviceId = String(editModal.item.service?.id ?? '').trim();
    const staffId = String(editModal.item.staff?.id ?? '').trim();

    if (!serviceId || !nextDate) {
      setEditAppointmentAvailabilityMessage('Selecciona una fecha para consultar la disponibilidad.');
      setEditAppointmentSlots([]);
      setEditAppointmentSlot('');
      return;
    }

    try {
      editAppointmentAvailabilityLockRef.current = true;
      setEditAppointmentAvailabilityLoading(true);
      const nextSlots = await getAppointmentAvailability(
        token,
        tenantId,
        serviceId,
        nextDate,
        staffId || undefined,
      );
      setEditAppointmentSlots(nextSlots);
      setEditAppointmentSlot('');
      setEditAppointmentAvailabilityMessage(
        nextSlots.some((slot) => slot.available)
          ? null
          : 'No hay horarios disponibles para esa fecha. Prueba con otro día o deja la reserva en su horario actual.',
      );
    } catch (err) {
      setEditAppointmentSlots([]);
      setEditAppointmentSlot('');
      setEditAppointmentAvailabilityMessage(null);
      const message = err instanceof Error ? err.message : 'No se pudo consultar la disponibilidad.';
      notify(message, 'error');
    } finally {
      editAppointmentAvailabilityLockRef.current = false;
      setEditAppointmentAvailabilityLoading(false);
    }
  }

  useEffect(() => {
    if (!createAppointmentOpen) {
      createAppointmentAvailabilityLockRef.current = false;
      setCreateAppointmentServiceId('');
      setCreateAppointmentStaffId('');
      setCreateAppointmentDate('');
      setCreateAppointmentSlot('');
      setCreateAppointmentPaymentMethod('cash');
      setCreateAppointmentSlots([]);
      setCreateAppointmentAvailabilityMessage(null);
      setCreateAppointmentAvailabilityLoading(false);
      return;
    }

    if (!createAppointmentServiceId && services[0]?.id) {
      setCreateAppointmentServiceId(services[0].id);
    }
  }, [createAppointmentOpen, createAppointmentServiceId, services]);

  useEffect(() => {
    if (!createAppointmentOpen) {
      return;
    }

    if (createAppointmentPaymentOptions.length === 0) {
      return;
    }

    if (!createAppointmentPaymentOptions.some((option) => option.value === createAppointmentPaymentMethod)) {
      setCreateAppointmentPaymentMethod(createAppointmentPaymentOptions[0].value);
    }
  }, [createAppointmentOpen, createAppointmentPaymentMethod, createAppointmentPaymentOptions]);

  useEffect(() => {
    if (!createAppointmentOpen) {
      return;
    }

    void loadCreateAppointmentAvailability();
  }, [createAppointmentOpen, createAppointmentServiceId, createAppointmentStaffId, createAppointmentDate]);

  useEffect(() => {
    if (editModal?.type !== 'appointment') {
      setEditAppointmentRescheduleEnabled(false);
      clearEditAppointmentAvailability();
      return;
    }

    setEditAppointmentRescheduleEnabled(false);
    clearEditAppointmentAvailability({ preserveDate: true });
    setEditAppointmentDate(editModal.item.startDateTime.slice(0, 10));
  }, [editModal]);

  useEffect(() => {
    if (editModal?.type !== 'appointment' || !editAppointmentRescheduleEnabled) {
      return;
    }

    void loadEditAppointmentAvailability();
  }, [editAppointmentDate, editAppointmentRescheduleEnabled, editModal]);

  async function handleCreateAppointmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId) return;

    const form = new FormData(event.currentTarget);
    const customerMode = String(form.get('customerMode') ?? 'existing') as 'existing' | 'new';
    const customerId = String(form.get('customerId') ?? '').trim();
    const serviceId = createAppointmentServiceId.trim();
    const staffId = createAppointmentStaffId.trim();
    const status = String(form.get('status') ?? 'confirmed') as AppointmentRecord['status'];
    const startDateTimeIso = createAppointmentSlot.split('::')[0]?.trim() ?? '';
    const paymentMethod = createAppointmentPaymentMethod;

    const payload: Record<string, unknown> = {
      serviceId,
      staffId: staffId || undefined,
      status,
      startDateTime: startDateTimeIso,
      paymentMethod,
      notes: String(form.get('notes') ?? '').trim() || undefined,
      internalNotes: String(form.get('internalNotes') ?? '').trim() || undefined,
    };

    if (customerMode === 'existing') {
      payload.customerId = customerId;
    } else {
      payload.customer = {
        fullName: String(form.get('customerFullName') ?? '').trim(),
        email: String(form.get('customerEmail') ?? '').trim(),
        phone: String(form.get('customerPhone') ?? '').trim(),
        identification: String(form.get('customerIdentification') ?? '').trim() || undefined,
        notes: String(form.get('customerNotes') ?? '').trim() || undefined,
      };
    }

    await wrapAction('appointment-create', async () => {
      if (!serviceId || !createAppointmentDate || !startDateTimeIso) {
        throw new Error('Selecciona un servicio, una fecha y un horario disponible.');
      }

      if (!paymentMethod) {
        throw new Error('Selecciona un método de pago.');
      }

      const availability = await getAppointmentAvailability(
        token,
        tenantId,
        serviceId,
        createAppointmentDate,
        staffId || undefined,
      );

      const slotIsAvailable = availability.some((slot) => {
        if (slot.start !== startDateTimeIso || !slot.available) {
          return false;
        }

        if (staffId) {
          return slot.staffId === staffId;
        }

        return true;
      });

      if (!slotIsAvailable) {
        throw new Error('El horario seleccionado ya no está disponible. Consulta la agenda antes de crear la reserva.');
      }

      await createAppointment(token, tenantId, payload);
      setCreateAppointmentOpen(false);
      await loadData();
    });
  }

  useEffect(() => {
    if (!token || !tenantId) return;
    loadData()
      .catch((err: Error) => {
        notify(err.message, 'error');
      })
      .finally(() => setIsLoading(false));
  }, [token, tenantId]);

  useEffect(() => {
    if (visibleTabs.length === 0) {
      return;
    }

    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallbackTab = visibleTabs[0]?.id ?? 'services';
      if (fallbackTab !== activeTab) {
        changeTab(fallbackTab);
      }
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (!token || !tenantId || !selectedPage?.id) return;
    getSections(token, tenantId, selectedPage.id)
      .then((data) => setSections(data as SectionRecord[]))
      .catch((err: Error) => notify(err.message, 'error'));
  }, [selectedPage?.id, tenantId, token]);

  useEffect(() => {
    if (activeTab !== 'appointments' || !token || !tenantId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      refreshAppointments({ silent: true }).catch(() => undefined);
    }, 45_000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, tenantId, token]);

  async function wrapAction(
    key: string,
    action: () => Promise<void>,
    options?: { successMessage?: string; suppressSuccess?: boolean },
  ) {
    setSaving(key);
    try {
      await action();
      if (!options?.suppressSuccess) {
        notify(options?.successMessage ?? 'Cambios guardados.', 'success');
      }
    } catch (err) {
      const message = err instanceof Error && err.message && err.message.trim()
        ? err.message
        : 'No se pudo completar la acción.';
      notify(message, 'error');
    } finally {
      setSaving(null);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !tenantId || !editModal) return;
    const form = new FormData(event.currentTarget);

    await wrapAction(`edit-${editModal.type}-${editModal.item.id}`, async () => {
      switch (editModal.type) {
        case 'membership':
          await updateTenantMembership(token, tenantId, editModal.item.id, {
            fullName: String(form.get('fullName') ?? editModal.item.user?.fullName ?? ''),
            email: String(form.get('email') ?? editModal.item.user?.email ?? ''),
            roleId: String(form.get('roleId') ?? editModal.item.roleId ?? ''),
            isActive: form.get('isActive') === 'on',
          });
          break;
        case 'role':
          await updateTenantRole(token, tenantId, editModal.item.id, {
            name: String(form.get('name') ?? editModal.item.name),
            description: String(form.get('description') ?? editModal.item.description ?? ''),
            permissions: form.getAll('permissions').map(String),
            isActive: form.get('isActive') === 'on',
          });
          break;
        case 'domain':
          await createTenantDomain(token, {
            tenantId,
            domain: String(form.get('domain') ?? ''),
            type: String(form.get('type') ?? editModal.item.type),
            isPrimary: form.get('isPrimary') === 'on',
            verificationStatus: String(form.get('verificationStatus') ?? editModal.item.verificationStatus),
          });
          await deleteTenantDomain(token, tenantId, editModal.item.id);
          break;
        case 'service':
          await updateService(token, tenantId, editModal.item.id, {
            name: String(form.get('name') ?? ''),
            description: String(form.get('description') ?? ''),
            durationMinutes: Number(form.get('durationMinutes') ?? editModal.item.durationMinutes),
            price: form.get('price') ? Number(form.get('price')) : null,
            category: String(form.get('category') ?? ''),
            isActive: form.get('isActive') === 'on',
          });
          break;
        case 'staff':
          await updateStaff(token, tenantId, editModal.item.id, {
            name: String(form.get('name') ?? ''),
            bio: String(form.get('bio') ?? ''),
            email: String(form.get('email') ?? ''),
            phone: String(form.get('phone') ?? ''),
            avatarUrl: String(form.get('avatarUrl') ?? ''),
            serviceIds: form.getAll('serviceIds').map(String),
          });
          break;
        case 'page':
          await updatePage(token, tenantId, editModal.item.id, {
            title: String(form.get('title') ?? ''),
            slug: String(form.get('slug') ?? ''),
            isPublished: form.get('isPublished') === 'on',
            isHome: form.get('isHome') === 'on',
            ogImageUrl: String(form.get('ogImageUrl') ?? editModal.item.ogImageUrl ?? ''),
          });
          break;
        case 'section': {
          const nextAssets = parseSectionAssetsJson(form.get('assetsJson'), editModal.item.content.assets);
          const previousAssets = Array.isArray(editModal.item.content.assets)
            ? (editModal.item.content.assets as SectionAssetRecord[])
            : [];

          const nextFileIds = new Set(
            nextAssets
              .map((asset) => String(asset.fileId ?? '').trim())
              .filter((value) => Boolean(value)),
          );
          const removedFileIds = Array.from(
            new Set(
              previousAssets
                .map((asset) => String(asset.fileId ?? '').trim())
                .filter((value) => Boolean(value) && !nextFileIds.has(value)),
            ),
          );

          for (const fileId of removedFileIds) {
            try {
              await deleteTenantFile(token, tenantId, fileId);
            } catch (error) {
              const message = error instanceof Error ? error.message : '';
              if (!message.toLowerCase().includes('archivo no encontrado')) {
                throw error;
              }
            }
          }

          await updateSection(token, tenantId, editModal.item.id, {
            type: String(form.get('type') ?? editModal.item.type),
            variant: String(form.get('variant') ?? editModal.item.variant),
            position: Number(form.get('position') ?? editModal.item.position),
            isVisible: form.get('isVisible') === 'on',
            content: {
              ...editModal.item.content,
              kicker: String(form.get('kicker') ?? String(editModal.item.content.kicker ?? '')),
              title: String(form.get('title') ?? String(editModal.item.content.title ?? '')),
              subtitle: String(form.get('subtitle') ?? String(editModal.item.content.subtitle ?? editModal.item.content.body ?? '')),
              ctaLabel: String(form.get('ctaLabel') ?? String(editModal.item.content.ctaLabel ?? '')),
              ctaUrl: String(form.get('ctaUrl') ?? String(editModal.item.content.ctaUrl ?? '')),
              text: String(form.get('text') ?? String(editModal.item.content.text ?? editModal.item.content.body ?? '')),
              address: String(form.get('address') ?? String(editModal.item.content.address ?? '')),
              hours: String(form.get('hours') ?? String(editModal.item.content.hours ?? '')),
              instagram: String(form.get('instagram') ?? String(editModal.item.content.instagram ?? '')),
              footerWhatsapp: String(form.get('footerWhatsapp') ?? String(editModal.item.content.footerWhatsapp ?? '')),
              body: String(form.get('body') ?? String(editModal.item.content.body ?? '')),
              imageUrl: String(form.get('imageUrl') ?? String(editModal.item.content.imageUrl ?? '')),
              html: String(form.get('html') ?? String(editModal.item.content.html ?? '')),
              css: String(form.get('css') ?? String(editModal.item.content.css ?? '')),
              assets: nextAssets,
            },
          });
          break;
        }
        case 'rule':
          await updateAvailabilityRule(token, tenantId, editModal.item.id, {
            staffId: String(form.get('staffId') ?? '').trim() || undefined,
            dayOfWeek: Number(form.get('dayOfWeek') ?? editModal.item.dayOfWeek),
            startTime: String(form.get('startTime') ?? ''),
            endTime: String(form.get('endTime') ?? ''),
            slotIntervalMinutes: Number(form.get('slotIntervalMinutes') ?? editModal.item.slotIntervalMinutes),
            isActive: form.get('isActive') === 'on',
          });
          break;
        case 'block':
          await updateScheduleBlock(token, tenantId, editModal.item.id, {
            staffId: String(form.get('staffId') ?? '').trim() || undefined,
            reason: String(form.get('reason') ?? ''),
            blockType: String(form.get('blockType') ?? editModal.item.blockType),
            startDateTime: toIsoDateTime(String(form.get('startDateTime') ?? editModal.item.startDateTime)),
            endDateTime: toIsoDateTime(String(form.get('endDateTime') ?? editModal.item.endDateTime)),
          });
          break;
        case 'appointment': {
          const paymentMethod = String(form.get('paymentMethod') ?? '').trim();
          const status = String(form.get('status') ?? editModal.item.status) as AppointmentRecord['status'];
          const notes = String(form.get('notes') ?? editModal.item.notes ?? '');
          const internalNotes = String(form.get('internalNotes') ?? editModal.item.internalNotes ?? '');
          const basePayload: Record<string, unknown> = {
            ...(paymentMethod ? { paymentMethod: paymentMethod as 'cash' | 'transfer' | 'payphone' } : {}),
            notes,
            internalNotes,
          };

          if (status === 'cancelled') {
            await updateAppointmentStatus(token, tenantId, editModal.item.id, status);

            const notesChanged = notes !== String(editModal.item.notes ?? '');
            const internalNotesChanged = internalNotes !== String(editModal.item.internalNotes ?? '');
            if (paymentMethod || notesChanged || internalNotesChanged) {
              await updateAppointment(token, tenantId, editModal.item.id, basePayload);
            }
            break;
          }

          const payload: Record<string, unknown> = {
            ...basePayload,
            status,
          };

          if (editAppointmentRescheduleEnabled) {
            const serviceId = String(editModal.item.service?.id ?? '').trim();
            const slotValue = String(form.get('appointmentSlot') ?? editAppointmentSlot).trim();

            if (!serviceId) {
              throw new Error('No se pudo identificar el servicio de la reserva para consultar disponibilidad.');
            }

            if (!editAppointmentDate || !slotValue) {
              throw new Error('Selecciona una nueva fecha y un horario disponible para reagendar.');
            }

            const { startDateTime, staffId } = parseAppointmentSlotValue(slotValue);
            if (!startDateTime) {
              throw new Error('Selecciona un horario disponible para reagendar.');
            }

            const availability = await getAppointmentAvailability(
              token,
              tenantId,
              serviceId,
              editAppointmentDate,
              String(editModal.item.staff?.id ?? '').trim() || undefined,
            );

            const slotIsAvailable = availability.some((slot) => {
              if (slot.start !== startDateTime || !slot.available) {
                return false;
              }

              return (slot.staffId ?? null) === staffId;
            });

            if (!slotIsAvailable) {
              throw new Error('El horario seleccionado ya no está disponible. Consulta la agenda antes de guardar.');
            }

            payload.startDateTime = startDateTime;
            payload.staffId = staffId ?? '';
          }

          await updateAppointment(token, tenantId, editModal.item.id, payload);
          break;
        }
        case 'customer':
          await updateCustomer(token, tenantId, editModal.item.id, {
            fullName: String(form.get('fullName') ?? ''),
            email: String(form.get('email') ?? ''),
            phone: String(form.get('phone') ?? ''),
            identification: String(form.get('identification') ?? ''),
            notes: String(form.get('notes') ?? ''),
          });
          break;
        case 'tenant-plan':
          await updatePlatformTenant(token, tenantId, {
            name: String(form.get('name') ?? tenantProfile?.tenant.name ?? ''),
            slug: String(form.get('slug') ?? tenantProfile?.tenant.slug ?? ''),
            status: String(form.get('status') ?? tenantProfile?.tenant.status ?? 'active'),
            plan: String(form.get('plan') ?? tenantProfile?.tenant.plan ?? 'starter'),
          });
          break;
      }

      await loadData();
      setEditModal(null);
    });
  }

  async function handleUploadBrandingAsset(field: 'logo' | 'favicon', file: File) {
    if (!token || !tenantId) return;

    setUploadingAsset(field);
    try {
      const uploaded = await uploadTenantFile(token, tenantId, file, 'branding', 'public');
      await updateTenantBranding(token, tenantId, {
        [field === 'logo' ? 'logoUrl' : 'faviconUrl']: uploaded.reference,
      });
      notify(field === 'logo' ? 'Logo actualizado correctamente' : 'Favicon actualizado correctamente', 'success');
      await loadData();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo subir el archivo', 'error');
    } finally {
      setUploadingAsset(null);
    }
  }

  async function handleUploadPageImage(page: PageRecord, file: File) {
    if (!token || !tenantId) return;
    await wrapAction(`upload-page-image-${page.id}`, async () => {
      const uploaded = await uploadTenantFile(token, tenantId, file, 'site', 'public');
      await updatePage(token, tenantId, page.id, { ogImageUrl: uploaded.reference });
      await loadData();
    });
  }

  async function handleUploadSectionImage(section: SectionRecord, file: File) {
    if (!token || !tenantId) return;
    await wrapAction(`upload-section-image-${section.id}`, async () => {
      const uploaded = await uploadTenantFile(
        token,
        tenantId,
        file,
        section.type === 'gallery' ? 'gallery' : 'site',
        'public',
      );

      if (section.type === 'gallery') {
        const currentItems = Array.isArray(section.content.items)
          ? (section.content.items as Array<Record<string, unknown>>)
          : [];

        await updateSection(token, tenantId, section.id, {
          content: {
            ...section.content,
            items: [
              ...currentItems,
              {
                title: file.name.replace(/\.[^.]+$/, ''),
                imageUrl: uploaded.reference,
              },
            ],
          },
        });
        await loadData();
        return;
      }

      await updateSection(token, tenantId, section.id, {
        content: {
          ...section.content,
          imageUrl: uploaded.reference,
        },
      });
      await loadData();
    });
  }

  async function handleUploadSectionAssets(section: SectionRecord, files: FileList | File[]) {
    if (!token || !tenantId) return;

    await wrapAction(`upload-section-assets-${section.id}`, async () => {
      const currentAssets = Array.isArray(section.content.assets)
        ? (section.content.assets as SectionAssetRecord[])
        : [];
      const nextAssets = [...currentAssets];

      for (const file of Array.from(files)) {
        const uploaded = await uploadTenantFile(token, tenantId, file, 'site', 'public');
        const baseName = normalizeAssetName(file.name.replace(/\.[^.]+$/, '')) || `asset-${nextAssets.length + 1}`;
        const existingIndex = nextAssets.findIndex((asset) => asset.name === baseName);

        if (existingIndex >= 0) {
          nextAssets[existingIndex] = {
            ...nextAssets[existingIndex],
            name: baseName,
            url: uploaded.reference,
            fileId: uploaded.fileId,
            alt: file.name.replace(/\.[^.]+$/, ''),
            label: file.name.replace(/\.[^.]+$/, ''),
            kind: 'image',
          };
          continue;
        }

        nextAssets.push({
          name: baseName,
          url: uploaded.reference,
          fileId: uploaded.fileId,
          alt: file.name.replace(/\.[^.]+$/, ''),
          label: file.name.replace(/\.[^.]+$/, ''),
          kind: 'image',
        });
      }

      await updateSection(token, tenantId, section.id, {
        content: {
          ...section.content,
          assets: nextAssets,
        },
      });
      await loadData();
    });
  }

  async function handleUploadStaffAvatar(member: StaffRecord, file: File) {
    if (!token || !tenantId) return;

    await wrapAction(`upload-staff-avatar-${member.id}`, async () => {
      const uploaded = await uploadTenantFile(token, tenantId, file, 'site', 'public');
      await updateStaff(token, tenantId, member.id, {
        avatarUrl: uploaded.reference,
      });
      await loadData();
    });
  }

  if (!token || !tenantId) {
    return null;
  }

  return (
    <AdminLayout
      isPlatformAdmin={Boolean(user?.isPlatformAdmin)}
      availableModules={tenantProfile?.effectiveModules ?? []}
      activeTenant={tenantProfile?.tenant ?? null}
      tenantRoutePrefix={tenantRoutePrefix}
      currentPath={currentLayoutPath}
    >
      {isLoading ? (
        <section className="grid gap-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </section>
      ) : (
        <section className="space-y-6">
          {showInternalTabSwitcher ? (
            <Card>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{tenantProfile?.tenant.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Configuración integral de la empresa seleccionada.
                  </p>
                </div>
                <div className="inline-flex rounded-full bg-[rgba(255,203,48,0.12)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--brand-gold-deep)]">
                  {tenantProfile?.tenant.status}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {visibleTabs.map(({ id, label }) => (
                  <Button
                    key={id}
                    variant={activeTab === id ? 'primary' : 'secondary'}
                    onClick={() => changeTab(id)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </Card>
          ) : null}

          {activeTab === 'general' ? (
            <Card>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">General</h3>
                <p className="mt-1 text-sm text-slate-500">Modifica aquí nombre, slug, plan y estado de la empresa.</p>
              </div>
              <form
                className="mt-6 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  wrapAction('tenant-general', async () => {
                    await updatePlatformTenant(token, tenantId, {
                      name: String(form.get('name') ?? ''),
                      slug: String(form.get('slug') ?? ''),
                      plan: String(form.get('plan') ?? ''),
                      status: String(form.get('status') ?? 'active'),
                    });
                    await loadData();
                  });
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Nombre" required>
                    <Input name="name" defaultValue={tenantProfile?.tenant.name ?? ''} />
                  </FormField>
                  <FormField label="Slug" required>
                    <Input name="slug" defaultValue={tenantProfile?.tenant.slug ?? ''} />
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Plan">
                    <Select name="plan" defaultValue={tenantProfile?.tenant.plan ?? ''}>
                      {platformPlans.length > 0 ? (
                        platformPlans.map((plan) => (
                          <option key={plan.id} value={plan.code}>
                            {plan.name}
                          </option>
                        ))
                      ) : (
                        <option value={tenantProfile?.tenant.plan ?? 'starter'}>
                          {tenantProfile?.tenant.plan ?? 'Starter'}
                        </option>
                      )}
                    </Select>
                  </FormField>
                  <FormField label="Estado">
                    <Select name="status" defaultValue={tenantProfile?.tenant.status ?? 'active'}>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </Select>
                  </FormField>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" isLoading={saving === 'tenant-general'} loadingLabel="Guardando...">
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          {activeTab === 'users' ? (
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Usuarios de la empresa</h3>
                  <p className="mt-1 text-sm text-slate-500">Usuarios con acceso administrativo a esta empresa.</p>
                </div>
                {can('users.create') ? <Button onClick={() => setCreateUserOpen(true)}>Nuevo usuario</Button> : null}
              </div>
              <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">
                  {filteredMemberships.length} usuario{filteredMemberships.length === 1 ? '' : 's'}
                </p>
                <Input
                  value={membershipsSearch}
                  onChange={(event) => setMembershipsSearch(event.target.value)}
                  placeholder="Buscar por nombre, correo o rol..."
                  className="max-w-md"
                />
              </div>
              <div className="mt-6 space-y-3">
                {filteredMemberships.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
                    No hay usuarios que coincidan con la búsqueda.
                  </div>
                ) : visibleMemberships.map((membership) => (
                  <div key={membership.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{membership.user?.fullName ?? 'Sin nombre'}</p>
                        <p className="text-sm text-slate-500">{membership.user?.email ?? 'Sin correo'}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          Rol: <span className="font-medium text-slate-900">{membership.roleName ?? membership.role}</span>
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                          {membership.isActive ? 'Activo' : 'Inactivo'}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="secondary"
                          disabled={!can('users.update')}
                          onClick={() => setEditModal({ type: 'membership', item: membership })}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={!can('users.reset_password') || saving === `reset-password-${membership.id}`}
                          onClick={() =>
                            wrapAction(`reset-password-${membership.id}`, async () => {
                              const response = (await resetTenantMembershipPassword(token, tenantId, membership.id)) as {
                                message?: string;
                                generatedPassword?: string | null;
                              };
                              if (response.generatedPassword) {
                                setGeneratedPassword(response.generatedPassword);
                              }
                              notify(response.message ?? 'Contraseña restablecida.', 'success');
                            })
                          }
                        >
                          Restablecer contraseña
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <DataTablePagination
                className="mt-6 rounded-2xl border border-slate-200 bg-white"
                page={Math.min(membershipsPage, membershipsPageCount)}
                pageCount={membershipsPageCount}
                pageSize={tablePageSize}
                totalItems={filteredMemberships.length}
                onPageChange={setMembershipsPage}
              />
            </Card>
          ) : null}

          {activeTab === 'roles' ? (
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                <h3 className="text-lg font-semibold text-slate-900">Roles de la empresa</h3>
                <p className="mt-1 text-sm text-slate-500">Cada rol define qué módulos y acciones puede usar cada usuario dentro del límite del plan.</p>
                </div>
                {can('roles.create') ? <Button onClick={() => setCreateRoleOpen(true)}>Nuevo rol</Button> : null}
              </div>
              <div className="mt-6">
                <DataTableShell>
                  <DataTableToolbar
                    summary={`${filteredRoles.length} rol${filteredRoles.length === 1 ? '' : 'es'}`}
                    searchValue={rolesSearch}
                    onSearchChange={setRolesSearch}
                    searchPlaceholder="Buscar por nombre, código o descripción..."
                  />
                  <DataTable>
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Rol</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Permisos</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="w-px whitespace-nowrap px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoles.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-500" colSpan={5}>No hay roles que coincidan con la búsqueda.</td>
                        </tr>
                      ) : (
                        visibleRoles.map((role) => (
                          <tr key={role.id} className="border-t border-slate-200">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{role.name}</p>
                              <p className="text-xs text-slate-500">{role.description || 'Sin descripción'}</p>
                            </td>
                            <td className="px-4 py-3">{role.code}</td>
                            <td className="px-4 py-3">{role.permissions.length}</td>
                            <td className="px-4 py-3">{role.isActive ? 'Activo' : 'Inactivo'}</td>
                            <td className="w-px whitespace-nowrap px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  className="h-9 px-4 text-xs font-semibold"
                                  disabled={!can('roles.update')}
                                  onClick={() => setEditModal({ type: 'role', item: role })}
                                >
                                  Editar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </DataTable>
                  <DataTablePagination
                    page={Math.min(rolesPage, rolesPageCount)}
                    pageCount={rolesPageCount}
                    pageSize={tablePageSize}
                    totalItems={filteredRoles.length}
                    onPageChange={setRolesPage}
                  />
                </DataTableShell>
              </div>
            </Card>
          ) : null}

          {activeTab === 'branding' ? (
            <BrandingSettingsSection
              saving={saving}
              uploadingAsset={uploadingAsset}
              branding={tenantProfile?.branding}
              settings={tenantProfile?.settings}
              tenantId={tenantId}
              accessToken={token}
              notify={notify}
              onUploadBrandingAsset={handleUploadBrandingAsset}
              onSubmitBranding={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                wrapAction('branding', async () => {
                  await updateTenantBranding(token, tenantId, {
                    logoUrl: String(form.get('logoUrl') ?? ''),
                    faviconUrl: String(form.get('faviconUrl') ?? ''),
                    primaryColor: String(form.get('primaryColor') ?? ''),
                    secondaryColor: String(form.get('secondaryColor') ?? ''),
                    accentColor: String(form.get('accentColor') ?? ''),
                    fontFamily: String(form.get('fontFamily') ?? ''),
                    borderRadius: String(form.get('borderRadius') ?? ''),
                    buttonStyle: String(form.get('buttonStyle') ?? ''),
                    customCss: String(form.get('customCss') ?? ''),
                  });
                  await loadData();
                });
              }}
              onSubmitSettings={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                wrapAction('settings', async () => {
                  await updateTenantSettings(token, tenantId, {
                    locale: String(form.get('locale') ?? 'es'),
                    canonicalDomain: String(form.get('canonicalDomain') ?? ''),
                    defaultSeoTitle: String(form.get('defaultSeoTitle') ?? ''),
                    defaultSeoDescription: String(form.get('defaultSeoDescription') ?? ''),
                    contactEmail: String(form.get('contactEmail') ?? ''),
                    contactPhone: String(form.get('contactPhone') ?? ''),
                    whatsappNumber: String(form.get('whatsappNumber') ?? ''),
                    contactAddress: String(form.get('contactAddress') ?? ''),
                    cashPaymentEnabled: form.get('cashPaymentEnabled') === 'on',
                    transferPaymentEnabled: form.get('transferPaymentEnabled') === 'on',
                    payphonePaymentEnabled: form.get('payphonePaymentEnabled') === 'on',
                    payphoneMode: String(form.get('payphoneMode') ?? 'redirect'),
                    payphoneStoreId: String(form.get('payphoneStoreId') ?? ''),
                    payphoneToken: String(form.get('payphoneToken') ?? ''),
                    siteIndexingEnabled: form.get('siteIndexingEnabled') === 'on',
                  });
                  await loadData();
                });
              }}
            />
          ) : null}

          {activeTab === 'email' ? (
            <Card>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Correo del tenant</h3>
                <p className="mt-1 text-sm text-slate-500">Si no defines un SMTP propio, el sistema usará el SMTP fallback configurado en el backend.</p>
              </div>
              <form
                className="mt-6 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
                  const form = new FormData(event.currentTarget);
                  const payload = {
                    mailConfig: {
                      host: String(form.get('host') ?? ''),
                      port: Number(form.get('port') ?? 587),
                      secure: form.get('secure') === 'on',
                      user: String(form.get('user') ?? ''),
                      pass: String(form.get('pass') ?? ''),
                      fromEmail: String(form.get('fromEmail') ?? ''),
                      fromName: String(form.get('fromName') ?? ''),
                    },
                  };

                  const testRecipient = String(form.get('testRecipient') ?? '').trim();
                  const isTesting = submitter?.dataset.action === 'test';
                  wrapAction('mail-settings', async () => {
                    await updateTenantSettings(token, tenantId, payload);
                    if (isTesting) {
                      if (!testRecipient) {
                        throw new Error('Ingresa un correo para la prueba.');
                      }
                      const result = await sendTenantTestEmail(token, tenantId, testRecipient) as { message?: string };
                      notify(result.message ?? 'Correo de prueba enviado.', 'success');
                    }
                    await loadData();
                  }, { suppressSuccess: isTesting });
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Servidor SMTP">
                    <Input name="host" defaultValue={tenantProfile?.settings?.mailConfig?.host ?? ''} />
                  </FormField>
                  <FormField label="Puerto">
                    <Input name="port" type="number" defaultValue={String(tenantProfile?.settings?.mailConfig?.port ?? 587)} />
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Usuario">
                    <Input name="user" defaultValue={tenantProfile?.settings?.mailConfig?.user ?? ''} />
                  </FormField>
                  <FormField label="Contraseña">
                    <Input name="pass" type="password" defaultValue={tenantProfile?.settings?.mailConfig?.pass ?? ''} />
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Correo remitente">
                    <Input name="fromEmail" type="email" defaultValue={tenantProfile?.settings?.mailConfig?.fromEmail ?? ''} />
                  </FormField>
                  <FormField label="Nombre remitente">
                    <Input name="fromName" defaultValue={tenantProfile?.settings?.mailConfig?.fromName ?? ''} />
                  </FormField>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  <Checkbox type="checkbox" name="secure" defaultChecked={Boolean(tenantProfile?.settings?.mailConfig?.secure)} /> Usar SSL / seguro
                </label>
                <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
                  <FormField label="Correo para prueba">
                    <Input
                      name="testRecipient"
                      type="email"
                      placeholder="destinatario@dominio.com"
                      defaultValue={tenantProfile?.settings?.contactEmail ?? ''}
                    />
                  </FormField>
                  <Button type="submit" variant="secondary" data-action="test" isLoading={saving === 'mail-settings'} loadingLabel="Probando...">
                    Guardar y enviar prueba
                  </Button>
                  <Button type="submit" isLoading={saving === 'mail-settings'} loadingLabel="Guardando...">
                    Guardar configuración
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          {activeTab === 'domains' ? (
            <DomainsSection
              saving={saving}
              domains={tenantProfile?.domains ?? []}
              onSubmit={(event) => {
                event.preventDefault();
                const formElement = event.currentTarget as HTMLFormElement | null;
                const form = new FormData(formElement ?? undefined);
                wrapAction('domain', async () => {
                  await createTenantDomain(token, {
                    tenantId,
                    domain: String(form.get('domain') ?? ''),
                    type: String(form.get('type') ?? 'custom'),
                    isPrimary: form.get('isPrimary') === 'on',
                    verificationStatus: String(form.get('verificationStatus') ?? 'pending'),
                  });
                  formElement?.reset?.();
                  await loadData();
                });
              }}
              onEdit={(domain) => setEditModal({ type: 'domain', item: domain })}
              onDelete={(domain) => {
                void wrapAction(`delete-domain-${domain.id}`, async () => {
                  await deleteTenantDomain(token, tenantId, domain.id);
                  if (editModal?.type === 'domain' && editModal.item.id === domain.id) {
                    setEditModal(null);
                  }
                  await loadData();
                }, { successMessage: 'Dominio eliminado.' });
              }}
              itemRow={(props) => <ItemRow {...props} />}
            />
          ) : null}

          {activeTab === 'site' ? (
            <SiteSection
              saving={saving}
              pages={pages}
              globalSections={globalSections}
              sections={sections}
              selectedPage={selectedPage}
              selectedPageId={selectedPageId}
              maxPages={typeof tenantProfile?.planCapabilities?.limits?.max_pages === 'number' ? Number(tenantProfile.planCapabilities.limits.max_pages) : null}
              onSelectPage={setSelectedPageId}
              onCreatePage={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                wrapAction('page-create', async () => {
                  await createPage(token, {
                    tenantId,
                    title: String(form.get('title') ?? ''),
                    slug: String(form.get('slug') ?? ''),
                    isPublished: form.get('isPublished') === 'on',
                    isIndexable: form.get('isIndexable') === 'on',
                  });
                  await loadData();
                });
              }}
              onCreateSection={(event) => {
                event.preventDefault();
                const formElement = event.currentTarget;
                const form = new FormData(event.currentTarget);
                const scope = String(form.get('scope') ?? 'page');
                if (scope === 'page' && !selectedPage) return;
                wrapAction('section', async () => {
                  await createSection(token, {
                    tenantId,
                    scope,
                    pageId: scope === 'page' ? selectedPage?.id : undefined,
                    type: String(form.get('type') ?? ''),
                    variant: String(form.get('variant') ?? ''),
                    position: Number(form.get('position') ?? 0),
                    isVisible: form.get('isVisible') === 'on',
                    content: {
                      title: String(form.get('contentTitle') ?? ''),
                      body: String(form.get('contentBody') ?? ''),
                      imageUrl: String(form.get('contentImageUrl') ?? ''),
                      html: String(form.get('contentHtml') ?? ''),
                      css: String(form.get('contentCss') ?? ''),
                    },
                    settings: {},
                  });
                  formElement.reset();
                  if (scope === 'global') {
                    const refreshedGlobal = await getSections(token, tenantId, undefined, 'global');
                    setGlobalSections(refreshedGlobal as SectionRecord[]);
                  } else if (selectedPage?.id) {
                    const refreshed = await getSections(token, tenantId, selectedPage.id);
                    setSections(refreshed as SectionRecord[]);
                  }
                });
              }}
              onEditPage={(page) => setEditModal({ type: 'page', item: page })}
              onEditSection={(section) => setEditModal({ type: 'section', item: section })}
              onUploadPageImage={handleUploadPageImage}
              onUploadSectionImage={handleUploadSectionImage}
              onUploadSectionAssets={handleUploadSectionAssets}
              sectionTypeOptions={sectionTypeOptions}
              itemRow={(props) => <ItemRow {...props} />}
            />
          ) : null}

          {activeTab === 'services' ? (
            <ServicesStaffSection
              currentPath="/services"
              canAccessServices
              canAccessStaff
              saving={saving}
              services={services}
              staff={staff}
              onCreateService={(event) => {
                event.preventDefault();
                const formElement = event.currentTarget as HTMLFormElement | null;
                const form = new FormData(formElement ?? undefined);
                wrapAction('service', async () => {
                  await createService(token, {
                    tenantId,
                    name: String(form.get('name') ?? ''),
                    description: String(form.get('description') ?? ''),
                    durationMinutes: Number(form.get('durationMinutes') ?? 0),
                    price: form.get('price') ? Number(form.get('price')) : undefined,
                    category: String(form.get('category') ?? ''),
                  });
                  formElement?.reset?.();
                  await loadData();
                });
              }}
              onCreateStaff={(event) => {
                event.preventDefault();
                const formElement = event.currentTarget as HTMLFormElement | null;
                const form = new FormData(formElement ?? undefined);
                wrapAction('staff', async () => {
                  await createStaff(token, {
                    tenantId,
                    name: String(form.get('name') ?? ''),
                    bio: String(form.get('bio') ?? ''),
                    email: String(form.get('email') ?? ''),
                    phone: String(form.get('phone') ?? ''),
                    serviceIds: form.getAll('serviceIds').map(String),
                  });
                  formElement?.reset?.();
                  await loadData();
                });
              }}
              onEditService={(service) => setEditModal({ type: 'service', item: service })}
              onEditStaff={(member) => setEditModal({ type: 'staff', item: member })}
              onDeleteService={(service) => {
                void wrapAction(`delete-service-${service.id}`, async () => {
                  const result = await deleteService(token, tenantId, service.id) as { message?: string };
                  await loadData();
                  notify(result.message ?? 'Servicio actualizado.', 'success');
                }, { suppressSuccess: true });
              }}
              onDeleteStaff={(member) => {
                void wrapAction(`delete-staff-${member.id}`, async () => {
                  const result = await deleteStaff(token, tenantId, member.id) as { message?: string };
                  await loadData();
                  notify(result.message ?? 'Profesional actualizado.', 'success');
                }, { suppressSuccess: true });
              }}
              onUploadStaffAvatar={handleUploadStaffAvatar}
              itemRow={(props) => <ItemRow {...props} />}
            />
          ) : null}

          {activeTab === 'staff' ? (
            <ServicesStaffSection
              currentPath="/staff"
              canAccessServices={canAccessServices}
              canAccessStaff={canAccessStaff}
              saving={saving}
              services={services}
              staff={staff}
              onCreateService={(event) => {
                event.preventDefault();
                const formElement = event.currentTarget as HTMLFormElement | null;
                const form = new FormData(formElement ?? undefined);
                wrapAction('service', async () => {
                  await createService(token, {
                    tenantId,
                    name: String(form.get('name') ?? ''),
                    description: String(form.get('description') ?? ''),
                    durationMinutes: Number(form.get('durationMinutes') ?? 0),
                    price: form.get('price') ? Number(form.get('price')) : undefined,
                    category: String(form.get('category') ?? ''),
                  });
                  formElement?.reset?.();
                  await loadData();
                });
              }}
              onCreateStaff={(event) => {
                event.preventDefault();
                const formElement = event.currentTarget as HTMLFormElement | null;
                const form = new FormData(formElement ?? undefined);
                wrapAction('staff', async () => {
                  await createStaff(token, {
                    tenantId,
                    name: String(form.get('name') ?? ''),
                    bio: String(form.get('bio') ?? ''),
                    email: String(form.get('email') ?? ''),
                    phone: String(form.get('phone') ?? ''),
                    serviceIds: form.getAll('serviceIds').map(String),
                  });
                  formElement?.reset?.();
                  await loadData();
                });
              }}
              onEditService={(service) => setEditModal({ type: 'service', item: service })}
              onEditStaff={(member) => setEditModal({ type: 'staff', item: member })}
              onDeleteService={(service) => {
                void wrapAction(`delete-service-${service.id}`, async () => {
                  const result = await deleteService(token, tenantId, service.id) as { message?: string };
                  await loadData();
                  notify(result.message ?? 'Servicio actualizado.', 'success');
                }, { suppressSuccess: true });
              }}
              onDeleteStaff={(member) => {
                void wrapAction(`delete-staff-${member.id}`, async () => {
                  const result = await deleteStaff(token, tenantId, member.id) as { message?: string };
                  await loadData();
                  notify(result.message ?? 'Profesional actualizado.', 'success');
                }, { suppressSuccess: true });
              }}
              onUploadStaffAvatar={handleUploadStaffAvatar}
              itemRow={(props) => <ItemRow {...props} />}
            />
          ) : null}

          {activeTab === 'agenda' ? (
            <div className="space-y-6">
              <Card>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Vista de agenda</h3>
                    <p className="mt-1 text-sm text-slate-500">Filtra reglas y bloqueos por profesional para operar la agenda de forma más clara.</p>
                  </div>
                  <div className="w-full max-w-sm">
                    <Select value={agendaStaffFilter} onChange={(event) => setAgendaStaffFilter(event.target.value)}>
                      <option value="">Todos los profesionales</option>
                      <option value="__general__">Solo elementos generales</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </Card>
              <div className="grid gap-6 xl:grid-cols-2">
              <ResourceCard
                title="Reglas de disponibilidad"
                subtitle="Ventanas de atención"
                toolbar={(
                  <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-500">
                      {filteredRules.length} regla{filteredRules.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <Select value={rulesStaffFilter} onChange={(event) => setRulesStaffFilter(event.target.value)} className="min-w-[220px]">
                        <option value="">Todos los profesionales</option>
                        <option value="__general__">Reglas generales</option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={rulesSearch}
                        onChange={(event) => setRulesSearch(event.target.value)}
                        placeholder="Buscar por profesional, día u hora..."
                        className="max-w-md"
                      />
                    </div>
                  </div>
                )}
                form={
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formElement = event.currentTarget;
                      const form = new FormData(formElement);
                      wrapAction('rule', async () => {
                        await createAvailabilityRule(token, {
                          tenantId,
                          staffId: String(form.get('staffId') ?? '').trim() || undefined,
                          dayOfWeek: Number(form.get('dayOfWeek') ?? 0),
                          startTime: String(form.get('startTime') ?? ''),
                          endTime: String(form.get('endTime') ?? ''),
                          slotIntervalMinutes: Number(form.get('slotIntervalMinutes') ?? 30),
                          isActive: form.get('isActive') === 'on',
                        });
                        formElement.reset();
                        await loadData();
                      });
                    }}
                  >
                    <div className="grid gap-3 md:grid-cols-5">
                      <FormField label="Profesional">
                        <Select name="staffId" defaultValue="">
                          <option value="">Todos / general</option>
                          {staff.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <FormField label="Día"><Select name="dayOfWeek">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</Select></FormField>
                      <FormField label="Hora inicio"><Input name="startTime" type="time" defaultValue="09:00" /></FormField>
                      <FormField label="Hora fin"><Input name="endTime" type="time" defaultValue="18:00" /></FormField>
                      <FormField label="Intervalo"><Input name="slotIntervalMinutes" type="number" defaultValue={30} /></FormField>
                    </div>
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700"><Checkbox type="checkbox" name="isActive" defaultChecked /> Activa</label>
                    <Button type="submit">Crear regla</Button>
                  </form>
                }
                items={visibleRules.map((rule) => (
                  <ItemRow
                    key={rule.id}
                    title={`${days[rule.dayOfWeek]} ${rule.startTime} - ${rule.endTime}`}
                    subtitle={`${rule.slotIntervalMinutes} min${rule.staff?.name ? ` · ${rule.staff.name}` : ' · General'}`}
                    meta={rule.isActive ? 'Activa' : 'Inactiva'}
                    actionLabel="Editar"
                    onAction={() => setEditModal({ type: 'rule', item: rule })}
                    secondaryActionLabel="Eliminar"
                    secondaryActionVariant="danger"
                    onSecondaryAction={() =>
                      wrapAction(`delete-rule-${rule.id}`, async () => {
                        await deleteAvailabilityRule(token!, tenantId, rule.id);
                        await loadData();
                      })
                    }
                  />
                ))}
                emptyState={filteredRules.length === 0 ? 'No hay reglas que coincidan con la búsqueda.' : undefined}
                pagination={(
                  <DataTablePagination
                    className="rounded-2xl border border-slate-200 bg-white"
                    page={Math.min(rulesPage, rulesPageCount)}
                    pageCount={rulesPageCount}
                    pageSize={tablePageSize}
                    totalItems={filteredRules.length}
                    onPageChange={setRulesPage}
                  />
                )}
              />
              <ResourceCard
                title="Bloqueos de agenda"
                subtitle="Bloqueos de agenda"
                toolbar={(
                  <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-500">
                      {filteredBlocks.length} bloqueo{filteredBlocks.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <Select value={blocksStaffFilter} onChange={(event) => setBlocksStaffFilter(event.target.value)} className="min-w-[220px]">
                        <option value="">Todos los profesionales</option>
                        <option value="__general__">Bloqueos generales</option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={blocksSearch}
                        onChange={(event) => setBlocksSearch(event.target.value)}
                        placeholder="Buscar por profesional, motivo o fecha..."
                        className="max-w-md"
                      />
                    </div>
                  </div>
                )}
                form={
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formElement = event.currentTarget;
                      const form = new FormData(formElement);
                      wrapAction('block', async () => {
                        await createScheduleBlock(token, {
                          tenantId,
                          staffId: String(form.get('staffId') ?? '').trim() || undefined,
                          startDateTime: toIsoDateTime(String(form.get('startDateTime') ?? '')),
                          endDateTime: toIsoDateTime(String(form.get('endDateTime') ?? '')),
                          reason: String(form.get('reason') ?? ''),
                          blockType: String(form.get('blockType') ?? 'manual'),
                        });
                        formElement.reset();
                        await loadData();
                      });
                    }}
                  >
                    <FormField label="Profesional">
                      <Select name="staffId" defaultValue="">
                        <option value="">Todos / general</option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Inicio"><Input name="startDateTime" type="datetime-local" required /></FormField>
                      <FormField label="Fin"><Input name="endDateTime" type="datetime-local" required /></FormField>
                    </div>
                    <FormField label="Motivo"><Input name="reason" /></FormField>
                    <FormField label="Tipo">
                      <Select name="blockType" defaultValue="manual">
                        <option value="manual">Manual</option>
                        <option value="staff_unavailable">No disponible</option>
                        <option value="holiday">Feriado</option>
                      </Select>
                    </FormField>
                    <Button type="submit">Crear bloqueo</Button>
                  </form>
                }
                items={visibleBlocks.map((block) => (
                  <ItemRow
                    key={block.id}
                    title={block.reason}
                    subtitle={`${new Date(block.startDateTime).toLocaleString()} → ${new Date(block.endDateTime).toLocaleString()}`}
                    meta={block.staff?.name ? `${block.blockType} · ${block.staff.name}` : `${block.blockType} · General`}
                    actionLabel="Editar"
                    onAction={() => setEditModal({ type: 'block', item: block })}
                    secondaryActionLabel="Eliminar"
                    secondaryActionVariant="danger"
                    onSecondaryAction={() =>
                      wrapAction(`delete-block-${block.id}`, async () => {
                        await deleteScheduleBlock(token!, tenantId, block.id);
                        await loadData();
                      })
                    }
                  />
                ))}
                emptyState={filteredBlocks.length === 0 ? 'No hay bloqueos que coincidan con la búsqueda.' : undefined}
                pagination={(
                  <DataTablePagination
                    className="rounded-2xl border border-slate-200 bg-white"
                    page={Math.min(blocksPage, blocksPageCount)}
                    pageCount={blocksPageCount}
                    pageSize={tablePageSize}
                    totalItems={filteredBlocks.length}
                    onPageChange={setBlocksPage}
                  />
                )}
              />
              </div>
            </div>
          ) : null}

          {activeTab === 'appointments' ? (
            <Card>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reservas</h3>
                <p className="mt-1 text-sm text-slate-500">Gestiona estado, notas internas y reagendamiento desde una sola acción.</p>
              </div>
              <DataTableShell>
                <DataTableToolbar
                  summary={`${filteredAppointments.length} reserva${filteredAppointments.length === 1 ? '' : 's'}`}
                  searchValue={appointmentsSearch}
                  onSearchChange={setAppointmentsSearch}
                  searchPlaceholder="Buscar por cliente, servicio o estado..."
                  actions={(
                    <>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setCreateAppointmentCustomerMode(customers.length > 0 ? 'existing' : 'new');
                          setCreateAppointmentServiceId(services[0]?.id ?? '');
                          setCreateAppointmentStaffId('');
                          setCreateAppointmentDate('');
                          setCreateAppointmentSlot('');
                          setCreateAppointmentPaymentMethod(
                            tenantProfile?.settings?.cashPaymentEnabled
                              ? 'cash'
                              : tenantProfile?.settings?.transferPaymentEnabled
                                ? 'transfer'
                                : 'payphone',
                          );
                          setCreateAppointmentSlots([]);
                          setCreateAppointmentAvailabilityMessage(null);
                          setCreateAppointmentAvailabilityLoading(false);
                          setCreateAppointmentOpen(true);
                        }}
                      >
                        Nueva reserva
                      </Button>
                      <Select
                        value={appointmentsSort}
                        onChange={(event) => setAppointmentsSort(event.target.value as 'nearest' | 'created_desc')}
                        className="min-w-[220px]"
                      >
                        <option value="nearest">Ordenar por cita más cercana</option>
                        <option value="created_desc">Ordenar por creación más reciente</option>
                      </Select>
                      <span className="text-xs text-slate-500">{formatRelativeUpdate(appointmentsLastUpdatedAt)}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        isLoading={appointmentsRefreshing}
                        loadingLabel="Cargando..."
                        onClick={() => refreshAppointments()}
                      >
                        Actualizar
                      </Button>
                    </>
                  )}
                />
                <DataTable>
                  <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Teléfono</th>
                        <th className="px-4 py-3">Servicio</th>
                        <th className="px-4 py-3">Profesional</th>
                        <th className="px-4 py-3">Pago</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Fecha de reserva</th>
                        <th className="px-4 py-3">Inicio del servicio</th>
                        <th className="w-px whitespace-nowrap px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-500" colSpan={9}>No hay reservas que coincidan con la búsqueda.</td>
                        </tr>
                      ) : (
                        visibleAppointments.map((appointment) => (
                          <tr key={appointment.id} className="border-t border-slate-200">
                            <td className="px-4 py-3">{appointment.customer?.fullName ?? '-'}</td>
                            <td className="px-4 py-3">{appointment.customer?.phone ?? '-'}</td>
                            <td className="px-4 py-3">{appointment.service?.name ?? '-'}</td>
                            <td className="px-4 py-3">{appointment.staff?.name ?? 'Por asignar'}</td>
                            <td className="px-4 py-3">{appointmentPaymentMethodLabel(appointment.paymentMethod)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${appointmentStatusClasses(appointment.status)}`}>
                                {appointmentStatusLabel(appointment.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                            {appointment.createdAt ? new Date(appointment.createdAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{new Date(appointment.startDateTime).toLocaleString()}</td>
                          <td className="w-px whitespace-nowrap px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {appointment.paymentMethod === 'payphone' && appointment.status === 'cancelled' ? (
                                <Button
                                  variant="danger"
                                  className="h-8 px-3 text-xs font-semibold"
                                  isLoading={saving === `reverse-payphone-${appointment.id}`}
                                  loadingLabel="Reversando..."
                                  onClick={() => {
                                    void wrapAction(`reverse-payphone-${appointment.id}`, async () => {
                                      await reversePayphoneAppointmentPayment(token!, tenantId, appointment.id);
                                      await loadData();
                                    }, { successMessage: 'Pago de PayPhone reversado.' });
                                  }}
                                >
                                  Reversar pago
                                </Button>
                              ) : null}
                              <Button
                                variant="primary"
                                className="h-8 px-3 text-xs font-semibold"
                                onClick={() => setEditModal({ type: 'appointment', item: appointment })}
                              >
                                Gestionar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </DataTable>
                <DataTablePagination
                  page={Math.min(appointmentsPage, appointmentsPageCount)}
                  pageCount={appointmentsPageCount}
                  pageSize={tablePageSize}
                  totalItems={filteredAppointments.length}
                  onPageChange={setAppointmentsPage}
                />
              </DataTableShell>
            </Card>
          ) : null}

          {activeTab === 'customers' ? (
            <Card>
              <h3 className="text-lg font-semibold text-slate-900">Clientes</h3>
              <DataTableShell>
                <DataTableToolbar
                  summary={`${filteredCustomers.length} cliente${filteredCustomers.length === 1 ? '' : 's'}`}
                  searchValue={customersSearch}
                  onSearchChange={setCustomersSearch}
                  searchPlaceholder="Buscar por nombre, correo, teléfono o identificación..."
                />
                <DataTable>
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Identificación</th>
                      <th className="px-4 py-3">Correo</th>
                      <th className="px-4 py-3">Teléfono</th>
                      <th className="w-px whitespace-nowrap px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-slate-500" colSpan={5}>No hay clientes que coincidan con la búsqueda.</td>
                      </tr>
                    ) : (
                      visibleCustomers.map((customer) => (
                        <tr key={customer.id} className="border-t border-slate-200">
                          <td className="px-4 py-3">{customer.fullName}</td>
                          <td className="px-4 py-3">{customer.identification ?? '-'}</td>
                          <td className="px-4 py-3">{customer.email}</td>
                          <td className="px-4 py-3">{customer.phone}</td>
                          <td className="w-px whitespace-nowrap px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="primary" className="h-9 px-4 text-xs font-semibold" onClick={() => setCustomerView(customer)}>
                                Ver
                              </Button>
                              <Button variant="secondary" className="h-9 px-4 text-xs font-semibold" onClick={() => setEditModal({ type: 'customer', item: customer })}>
                                Editar
                              </Button>
                              <Button
                                variant="danger"
                                className="h-9 px-4 text-xs font-semibold"
                                onClick={() => wrapAction(`delete-customer-${customer.id}`, async () => {
                                  await deleteCustomer(token, tenantId, customer.id);
                                  await loadData();
                                })}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </DataTable>
                <DataTablePagination
                  page={Math.min(customersPage, customersPageCount)}
                  pageCount={customersPageCount}
                  pageSize={tablePageSize}
                  totalItems={filteredCustomers.length}
                  onPageChange={setCustomersPage}
                />
              </DataTableShell>
            </Card>
          ) : null}
        </section>
      )}

      <Modal
        open={createAppointmentOpen}
        onClose={() => setCreateAppointmentOpen(false)}
        title="Nueva reserva"
        description="Crea una reserva manual y asigna o crea el cliente desde esta misma ventana."
        maxWidthClassName="max-w-5xl"
      >
        <form className="grid gap-5" onSubmit={handleCreateAppointmentSubmit}>
          <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField label="Servicio" required>
                <Select
                  name="serviceId"
                  value={createAppointmentServiceId}
                  disabled={services.length === 0}
                  onChange={(event) => {
                    setCreateAppointmentServiceId(event.target.value);
                    setCreateAppointmentStaffId('');
                    setCreateAppointmentDate('');
                    setCreateAppointmentSlot('');
                    setCreateAppointmentSlots([]);
                    setCreateAppointmentAvailabilityMessage(null);
                  }}
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Profesional" optional>
                <Select
                  name="staffId"
                  value={createAppointmentStaffId}
                  disabled={false}
                  onChange={(event) => {
                    setCreateAppointmentStaffId(event.target.value);
                    setCreateAppointmentDate('');
                    setCreateAppointmentSlot('');
                    setCreateAppointmentSlots([]);
                    setCreateAppointmentAvailabilityMessage(null);
                  }}
                >
                  <option value="">Sin asignar</option>
                  {createAppointmentCompatibleStaff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
                {createAppointmentServiceId && createAppointmentCompatibleStaff.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    No hay profesionales asignados a este servicio. Puedes dejarlo sin asignar o revisar el equipo.
                  </p>
                ) : null}
              </FormField>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-navy)] text-sm font-semibold text-white">3</span>
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Disponibilidad</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Selecciona una fecha para consultar horarios disponibles en el backend.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[0.7fr_0.3fr]">
                <Input
                  type="date"
                  value={createAppointmentDate}
                  onChange={(event) => {
                    setCreateAppointmentDate(event.target.value);
                    setCreateAppointmentSlot('');
                    setCreateAppointmentSlots([]);
                    setCreateAppointmentAvailabilityMessage(null);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={createAppointmentAvailabilityLoading}
                  loadingLabel="Consultando..."
                  disabled={!createAppointmentServiceId || !createAppointmentDate}
                  onClick={() => void loadCreateAppointmentAvailability()}
                >
                  Consultar disponibilidad
                </Button>
              </div>

              {createAppointmentAvailabilityMessage ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {createAppointmentAvailabilityMessage}
                </div>
              ) : null}

              {createAppointmentSlots.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {createAppointmentSlots.map((slot) => {
                    const slotValue = getAppointmentSlotValue(slot);
                    const isSelected = createAppointmentSlot === slotValue;
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
                          name="slot"
                          value={slotValue}
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={(event) => setCreateAppointmentSlot(event.target.value)}
                        />
                        <div>
                          <p className={`font-medium ${isDisabled ? 'text-slate-500' : 'text-slate-900'}`}>
                            {formatAvailabilityDateTime(slot.start)}
                          </p>
                          <p className={`text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
                            {slot.staffName ?? createAppointmentSelectedService?.name ?? 'Profesional seleccionado'}
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
            </div>

            <FormField label="Estado" required>
              <Select name="status" defaultValue="confirmed">
                <option value="confirmed">Confirmada</option>
                <option value="pending">Pendiente</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">No asistió</option>
              </Select>
            </FormField>

            <FormField label="Método de pago" required>
              <Select
                name="paymentMethod"
                value={createAppointmentPaymentMethod}
                onChange={(event) => setCreateAppointmentPaymentMethod(event.target.value as 'cash' | 'transfer' | 'payphone')}
                disabled={createAppointmentPaymentOptions.length === 0}
              >
                {createAppointmentPaymentOptions.length === 0 ? (
                  <option value="">No hay métodos habilitados</option>
                ) : (
                  createAppointmentPaymentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                )}
              </Select>
              {createAppointmentPaymentOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">Activa al menos un método de pago en la configuración del tenant.</p>
              ) : null}
            </FormField>
          </div>

          <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900">Cliente</h4>
                <p className="mt-1 text-sm text-slate-500">Selecciona un cliente existente o crea uno nuevo al instante.</p>
              </div>
              <div className="min-w-[220px]">
                <Select
                  name="customerMode"
                  value={createAppointmentCustomerMode}
                  onChange={(event) => setCreateAppointmentCustomerMode(event.target.value as 'existing' | 'new')}
                >
                  <option value="existing" disabled={customers.length === 0}>Cliente existente</option>
                  <option value="new">Cliente nuevo</option>
                </Select>
              </div>
            </div>

            {createAppointmentCustomerMode === 'existing' ? (
              <div className="grid gap-4 lg:grid-cols-[1fr,auto] lg:items-end">
                <FormField label="Cliente existente" required>
                  <Select name="customerId" defaultValue={customers[0]?.id ?? ''} disabled={customers.length === 0}>
                    {customers.length === 0 ? (
                      <option value="">No hay clientes disponibles</option>
                    ) : (
                      customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.fullName} · {customer.phone}
                        </option>
                      ))
                    )}
                  </Select>
                </FormField>
                <div className="text-xs text-slate-500">
                  {customers.length === 0 ? 'No hay clientes cargados todavía. Cambia a cliente nuevo.' : 'Puedes elegir cualquier cliente registrado.'}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <FormField label="Nombre completo" required>
                  <Input name="customerFullName" />
                </FormField>
                <FormField label="Correo electrónico" required>
                  <Input name="customerEmail" type="email" />
                </FormField>
                <FormField label="Teléfono" required>
                  <Input name="customerPhone" />
                </FormField>
                <FormField label="Identificación" optional>
                  <Input name="customerIdentification" />
                </FormField>
                <FormField label="Notas del cliente" optional>
                  <Textarea name="customerNotes" className="min-h-20" />
                </FormField>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <FormField label="Notas de la reserva" optional>
              <Textarea name="notes" className="min-h-24" />
            </FormField>
            <FormField label="Notas internas" optional>
              <Textarea name="internalNotes" className="min-h-24" />
            </FormField>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreateAppointmentOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving === 'appointment-create'} loadingLabel="Creando..." disabled={!createAppointmentSlot || createAppointmentPaymentOptions.length === 0}>
              Crear reserva
            </Button>
          </div>
        </form>
      </Modal>

      <EditEntityModal
        editModal={editModal}
        savingKey={saving}
        generatedPassword={generatedPassword}
        onClose={() => setEditModal(null)}
        onSubmit={handleEditSubmit}
        onDelete={
          editModal?.type === 'domain'
            ? () => {
                void wrapAction(`delete-domain-${editModal.item.id}`, async () => {
                  await deleteTenantDomain(token, tenantId, editModal.item.id);
                  setEditModal(null);
                  await loadData();
                }, { successMessage: 'Dominio eliminado.' });
              }
            : undefined
        }
        onCloseGeneratedPassword={() => setGeneratedPassword(null)}
        days={days}
        tenantRoles={tenantRoles}
        planOptions={platformPlans}
        rolePermissionGroups={tenantPermissionGroups.map((group) => ({
          module: group.module,
          label: group.label,
          permissions: [...group.permissions],
        }))}
        sectionTypeOptions={sectionTypeOptions}
        services={services.map((service) => ({ id: service.id, name: service.name }))}
        staffOptions={staff.map((member) => ({ id: member.id, name: member.name }))}
        appointmentRescheduleEnabled={editAppointmentRescheduleEnabled}
        onAppointmentRescheduleEnabledChange={handleEditAppointmentRescheduleChange}
        appointmentDate={editAppointmentDate}
        onAppointmentDateChange={setEditAppointmentDate}
        appointmentSlots={editAppointmentSlots}
        appointmentSlot={editAppointmentSlot}
        onAppointmentSlotChange={setEditAppointmentSlot}
        appointmentAvailabilityLoading={editAppointmentAvailabilityLoading}
        appointmentAvailabilityMessage={editAppointmentAvailabilityMessage}
      />

      <Modal
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        title="Nuevo usuario"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            wrapAction('tenant-membership', async () => {
              const result = (await createTenantMembership(token, tenantId, {
                fullName: String(form.get('fullName') ?? ''),
                email: String(form.get('email') ?? ''),
                roleId: String(form.get('roleId') ?? ''),
                isActive: form.get('isActive') === 'on',
              })) as { generatedPassword?: string | null };
              if (result.generatedPassword) {
                setGeneratedPassword(result.generatedPassword);
              }
              setCreateUserOpen(false);
              await loadData();
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nombre completo" required>
              <Input name="fullName" />
            </FormField>
            <FormField label="Correo" required>
              <Input name="email" type="email" />
            </FormField>
          </div>
          <FormField label="Rol">
            <Select
              name="roleId"
              defaultValue={tenantRoles[0]?.id ?? ''}
              disabled={tenantRoles.length === 0}
            >
              {tenantRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </FormField>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <Checkbox type="checkbox" name="isActive" defaultChecked /> Activo
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreateUserOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving === 'tenant-membership'} loadingLabel="Guardando...">
              Crear usuario
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={createRoleOpen}
        onClose={() => setCreateRoleOpen(false)}
        title="Nuevo rol"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const permissions = form.getAll('permissions').map(String);
            wrapAction('tenant-role', async () => {
              await createTenantRole(token, tenantId, {
                code: String(form.get('code') ?? '').trim().toLowerCase(),
                name: String(form.get('name') ?? '').trim(),
                description: String(form.get('description') ?? '').trim(),
                permissions,
                isActive: form.get('isActive') === 'on',
              });
              setCreateRoleOpen(false);
              await loadData();
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nombre" required>
              <Input name="name" />
            </FormField>
            <FormField label="Código" required>
              <Input name="code" placeholder="recepcion" />
            </FormField>
          </div>
          <FormField label="Descripción">
            <Input name="description" />
          </FormField>
          <div className="grid gap-4">
            {tenantPermissionGroups.map((group) => (
              <div key={group.module} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {group.permissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm text-slate-700">
                      <Checkbox type="checkbox" name="permissions" value={permission} />
                      {permission}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <Checkbox type="checkbox" name="isActive" defaultChecked /> Activo
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setCreateRoleOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving === 'tenant-role'} loadingLabel="Guardando...">
              Crear rol
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(customerView)}
        onClose={() => setCustomerView(null)}
        title="Ficha de cliente"
      >
        {customerView ? (
          <div className="grid gap-4">
            <InfoBlock label="Nombre" value={customerView.fullName || '-'} />
            <InfoBlock label="Identificación" value={customerView.identification || '-'} />
            <InfoBlock label="Correo" value={customerView.email || '-'} />
            <InfoBlock label="Teléfono" value={customerView.phone || '-'} />
            <InfoBlock label="Notas" value={customerView.notes || '-'} />
            <div className="flex justify-end">
              <Button type="button" onClick={() => setCustomerView(null)}>Cerrar</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminLayout>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-[0.7rem] uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-base font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ResourceCard({
  title,
  subtitle,
  toolbar,
  form,
  items,
  emptyState,
  pagination,
}: {
  title: string;
  subtitle: string;
  toolbar?: ReactNode;
  form: ReactNode;
  items: ReactNode[];
  emptyState?: string;
  pagination?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <span className="text-sm text-slate-500">{subtitle}</span>
      </div>
      {toolbar}
      <div className="mt-5">{form}</div>
      <div className="mt-6 grid gap-3">
        {items.length > 0 ? items : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-sm text-slate-500">
            {emptyState ?? 'No hay elementos disponibles.'}
          </div>
        )}
      </div>
      {pagination ? <div className="mt-6">{pagination}</div> : null}
    </Card>
  );
}

function ItemRow({
  title,
  subtitle,
  meta,
  actionLabel,
  onAction,
  visual,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionVariant = 'secondary',
  uploadSlot,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  actionLabel: string;
  onAction: () => void;
  visual?: ReactNode;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionVariant?: 'secondary' | 'danger';
  uploadSlot?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/72 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {visual ? <div className="shrink-0">{visual}</div> : null}
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            {meta ? <p className="mt-1 text-xs text-slate-500">{meta}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadSlot}
          <Button type="button" variant="secondary" className="h-9 rounded-xl px-3 text-sm" onClick={onAction}>
            {actionLabel}
          </Button>
          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              type="button"
              variant={secondaryActionVariant}
              className="h-9 rounded-xl px-3 text-sm"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
