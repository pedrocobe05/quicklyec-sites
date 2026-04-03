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

export const DEFAULT_TENANT_ROLE_DEFINITIONS = [
  {
    code: ADMINISTRATOR_ROLE_CODE,
    name: 'Administrador',
    description: 'Acceso completo a la operación del tenant según lo permitido por el plan.',
    permissions: [...TENANT_PERMISSION_CATALOG],
  },
] as const;

export type PlanAccessDefinition = {
  code: string;
  name: string;
  description: string;
  modules: TenantModuleCode[];
  features: string[];
  limits: Record<string, number | boolean | null>;
};

export const PLAN_ACCESS_DEFINITIONS: Record<string, PlanAccessDefinition> = {
  basic: {
    code: 'basic',
    name: 'Básico',
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
    description: 'Gestión operativa con reservas online, agenda y panel administrativo.',
    modules: ['site', 'branding', 'domains', 'settings', 'services', 'staff', 'agenda', 'appointments', 'customers', 'users', 'roles'],
    features: ['whatsapp_cta', 'hosting_included', 'quickly_subdomain', 'online_booking', 'custom_domain', 'admin_panel'],
    limits: {
      max_pages: 6,
      max_sections: 12,
      custom_domain: true,
      online_booking: true,
      agenda: true,
      customers: true,
      admin_users: null,
    },
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    description: 'Operación avanzada con notificaciones, recordatorios, estadísticas y SEO.',
    modules: ['site', 'branding', 'domains', 'settings', 'services', 'staff', 'agenda', 'appointments', 'customers', 'users', 'roles', 'seo', 'notifications', 'reports'],
    features: ['whatsapp_cta', 'hosting_included', 'quickly_subdomain', 'online_booking', 'custom_domain', 'admin_panel', 'email_notifications', 'appointment_reminders', 'business_stats', 'seo_initial_optimization'],
    limits: {
      max_pages: 10,
      max_sections: null,
      custom_domain: true,
      online_booking: true,
      agenda: true,
      customers: true,
      admin_users: null,
    },
  },
};

const PLAN_ALIASES: Record<string, string> = {
  starter: 'basic',
  enterprise: 'premium',
};

export function normalizePlanCode(planCode?: string | null) {
  if (!planCode) {
    return 'basic';
  }

  return PLAN_ALIASES[planCode] ?? planCode;
}

export function getPlanAccessDefinition(planCode?: string | null) {
  return PLAN_ACCESS_DEFINITIONS[normalizePlanCode(planCode)] ?? PLAN_ACCESS_DEFINITIONS.basic;
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

export function getPlanMetadata(planCode?: string | null) {
  const definition = getPlanAccessDefinition(planCode);
  return {
    features: definition.features,
    limits: definition.limits,
  };
}
