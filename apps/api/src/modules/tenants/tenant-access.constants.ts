export const TENANT_MODULES = [
  'site',
  'branding',
  'domains',
  'settings',
  'services',
  'staff',
  'agenda',
  'appointments',
  'customers',
  'users',
  'roles',
  'seo',
  'notifications',
  'reports',
] as const;

export type TenantModuleCode = (typeof TENANT_MODULES)[number];

export const TENANT_PERMISSION_CATALOG = [
  'site.view',
  'site.update',
  'branding.view',
  'branding.update',
  'domains.view',
  'domains.update',
  'settings.view',
  'settings.update',
  'services.view',
  'services.create',
  'services.update',
  'services.delete',
  'staff.view',
  'staff.create',
  'staff.update',
  'staff.delete',
  'agenda.view',
  'agenda.create',
  'agenda.update',
  'agenda.delete',
  'appointments.view',
  'appointments.create',
  'appointments.update',
  'appointments.delete',
  'customers.view',
  'customers.create',
  'customers.update',
  'customers.delete',
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'users.reset_password',
  'roles.view',
  'roles.create',
  'roles.update',
  'roles.delete',
  'seo.view',
  'seo.update',
  'notifications.view',
  'reports.view',
] as const;

export const ADMINISTRATOR_ROLE_CODE = 'administrator';
export const STAFF_ROLE_CODE = 'staff';

/**
 * Rol operativo: agenda, reservas y clientes filtrados al `linkedStaffId`.
 * `services.view` y `staff.view` (solo lectura) permiten cargar servicios y la ficha propia en el panel al crear reservas.
 */
export const STAFF_ROLE_PERMISSIONS = [
  'services.view',
  'staff.view',
  'agenda.view',
  'agenda.create',
  'agenda.update',
  'agenda.delete',
  'appointments.view',
  'appointments.create',
  'appointments.update',
  'customers.view',
  'customers.create',
  'customers.update',
] as const;

export const DEFAULT_TENANT_ROLE_DEFINITIONS = [
  {
    code: ADMINISTRATOR_ROLE_CODE,
    name: 'Admin de tenant',
    description: 'Acceso completo a la configuración y operación del tenant según lo permitido por el plan.',
    permissions: [...TENANT_PERMISSION_CATALOG],
  },
  {
    code: STAFF_ROLE_CODE,
    name: 'Staff',
    description: 'Acceso operativo a agenda, reservas y clientes, sin configuración administrativa.',
    permissions: [...STAFF_ROLE_PERMISSIONS],
  },
] as const;

export const IMMUTABLE_SYSTEM_TENANT_ROLE_CODES = DEFAULT_TENANT_ROLE_DEFINITIONS.map((role) => role.code);

export type PlanAccessDefinition = {
  code: string;
  name: string;
  description: string;
  modules: TenantModuleCode[];
  features: string[];
  limits: Record<string, number | boolean | null>;
};

export const PLAN_ACCESS_DEFINITIONS: Record<string, PlanAccessDefinition> = {
  starter: {
    code: 'starter',
    name: 'Starter',
    description: 'Presencia digital inicial con landing profesional y contacto directo.',
    modules: ['site', 'branding', 'domains', 'settings', 'services'],
    features: ['whatsapp_cta', 'hosting_included', 'quickly_subdomain'],
    limits: {
      max_pages: 3,
      max_sections: 6,
      custom_domain: false,
      online_booking: false,
      agenda: false,
      customers: false,
      admin_users: 1,
    },
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    description: 'Operación completa: reservas, agenda, panel administrativo, notificaciones y estadísticas.',
    modules: ['site', 'branding', 'domains', 'settings', 'services', 'staff', 'agenda', 'appointments', 'customers', 'users', 'roles', 'seo', 'notifications', 'reports'],
    features: ['whatsapp_cta', 'hosting_included', 'quickly_subdomain', 'online_booking', 'custom_domain', 'admin_panel', 'email_notifications', 'appointment_reminders', 'business_stats', 'seo_initial_optimization'],
    limits: {
      max_pages: 3,
      max_sections: null,
      custom_domain: true,
      online_booking: true,
      agenda: true,
      customers: true,
      admin_users: null,
    },
  },
};

// Aliases para compatibilidad con registros anteriores en DB
const PLAN_ALIASES: Record<string, string> = {
  basic: 'starter',
  enterprise: 'starter',
  premium: 'pro',
};

export function normalizePlanCode(planCode?: string | null) {
  if (!planCode) {
    return 'starter';
  }

  return PLAN_ALIASES[planCode] ?? planCode;
}

export function getPlanAccessDefinition(planCode?: string | null) {
  return PLAN_ACCESS_DEFINITIONS[normalizePlanCode(planCode)] ?? PLAN_ACCESS_DEFINITIONS.starter;
}

/**
 * Une `tenantModules` persistidos con la lista canónica del plan en código.
 * Evita que planes guardados antes de ampliar módulos (agenda, reservas, clientes, etc.)
 * sigan recortando el menú y `effectiveModules` frente a roles actualizados.
 */
export function mergeStoredPlanModulesWithCanonical(
  storedModules: string[] | null | undefined,
  planCode?: string | null,
): string[] {
  const canonical = getPlanAccessDefinition(planCode).modules;
  if (!storedModules?.length) {
    return [...canonical];
  }
  return Array.from(new Set([...storedModules, ...canonical]));
}

export function deriveModulesFromPermissions(permissions: string[]) {
  return Array.from(
    new Set(
      permissions
        .map((permission) => permission.split('.')[0])
        .filter((value): value is TenantModuleCode => TENANT_MODULES.includes(value as TenantModuleCode)),
    ),
  );
}

export function intersectTenantModules(planModules: string[], rolePermissions: string[]) {
  const roleModules = deriveModulesFromPermissions(rolePermissions);
  return planModules.filter((moduleCode) => roleModules.includes(moduleCode as TenantModuleCode));
}

export function resolveTenantMembershipAccess(planCode?: string | null, rolePermissions: string[] = []) {
  const planModules = getPlanAccessDefinition(planCode).modules;
  const allowedModules = rolePermissions.length > 0
    ? intersectTenantModules(planModules, rolePermissions)
    : planModules;
  const permissions = rolePermissions.filter((permission) =>
    allowedModules.includes(permission.split('.')[0]),
  );

  return {
    allowedModules,
    permissions,
  };
}

export function getPlanMetadata(planCode?: string | null) {
  const definition = getPlanAccessDefinition(planCode);
  return {
    features: definition.features,
    limits: definition.limits,
  };
}
