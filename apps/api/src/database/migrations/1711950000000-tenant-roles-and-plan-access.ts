import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const ADMINISTRATOR_ROLE_CODE = 'administrator';

const TENANT_PERMISSION_CATALOG = [
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
];

const DEFAULT_TENANT_ROLE_DEFINITIONS = [
  {
    code: ADMINISTRATOR_ROLE_CODE,
    name: 'Administrador',
    description: 'Acceso completo a la operación del tenant según lo permitido por el plan.',
    permissions: TENANT_PERMISSION_CATALOG,
  },
];

const PLAN_ACCESS_DEFINITIONS = {
  basic: {
    code: 'basic',
    name: 'Básico',
    description: 'Presencia digital inicial con landing profesional y contacto directo.',
    modules: ['site', 'branding', 'domains', 'settings', 'services'],
    features: ['whatsapp_cta', 'hosting_included', 'quickly_subdomain'],
    limits: { max_sections: 6, custom_domain: false, online_booking: false, agenda: false, customers: false, admin_users: 1 },
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    description: 'Gestión operativa con reservas online, agenda y panel administrativo.',
    modules: ['site', 'branding', 'domains', 'settings', 'services', 'staff', 'agenda', 'appointments', 'customers', 'users', 'roles'],
    features: ['whatsapp_cta', 'hosting_included', 'quickly_subdomain', 'online_booking', 'custom_domain', 'admin_panel'],
    limits: { max_sections: 12, custom_domain: true, online_booking: true, agenda: true, customers: true, admin_users: null },
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    description: 'Operación avanzada con notificaciones, recordatorios, estadísticas y SEO.',
    modules: ['site', 'branding', 'domains', 'settings', 'services', 'staff', 'agenda', 'appointments', 'customers', 'users', 'roles', 'seo', 'notifications', 'reports'],
    features: ['whatsapp_cta', 'hosting_included', 'quickly_subdomain', 'online_booking', 'custom_domain', 'admin_panel', 'email_notifications', 'appointment_reminders', 'business_stats', 'seo_initial_optimization'],
    limits: { max_sections: null, custom_domain: true, online_booking: true, agenda: true, customers: true, admin_users: null },
  },
} as const;

function normalizePlanCode(planCode?: string | null) {
  if (!planCode) return 'basic';
  if (planCode === 'starter') return 'basic';
  if (planCode === 'enterprise') return 'premium';
  return planCode;
}

function getPlanMetadata(planCode?: string | null) {
  const normalized = normalizePlanCode(planCode);
  const definition = PLAN_ACCESS_DEFINITIONS[normalized as keyof typeof PLAN_ACCESS_DEFINITIONS] ?? PLAN_ACCESS_DEFINITIONS.basic;
  return {
    features: definition.features,
    limits: definition.limits,
  };
}

export class TenantRolesAndPlanAccess1711950000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "code" varchar(60) NOT NULL,
        "name" varchar(120) NOT NULL,
        "description" varchar(255),
        "isSystem" boolean NOT NULL DEFAULT true,
        "isActive" boolean NOT NULL DEFAULT true,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_roles_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_roles_tenant_code"
      ON "tenant_roles" ("tenantId", "code")
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_memberships"
      ADD COLUMN IF NOT EXISTS "roleId" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_memberships"
      ADD CONSTRAINT "FK_tenant_memberships_role"
      FOREIGN KEY ("roleId") REFERENCES "tenant_roles"("id") ON DELETE SET NULL
    `).catch(() => undefined);

    const tenants = (await queryRunner.query(`SELECT "id", "plan" FROM "tenants"`)) as Array<{
      id: string;
      plan: string;
    }>;

    for (const tenant of tenants) {
      const existingRole = (
        await queryRunner.query(
          `SELECT "id" FROM "tenant_roles" WHERE "tenantId" = $1 AND "code" = $2 LIMIT 1`,
          [tenant.id, ADMINISTRATOR_ROLE_CODE],
        )
      )?.[0] as { id: string } | undefined;

      const roleId = existingRole?.id ?? randomUUID();

      if (!existingRole) {
        const definition = DEFAULT_TENANT_ROLE_DEFINITIONS[0];
        await queryRunner.query(
          `
            INSERT INTO "tenant_roles" (
              "id", "tenantId", "code", "name", "description", "isSystem", "isActive", "permissions", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, true, true, $6::jsonb, now(), now())
          `,
          [roleId, tenant.id, definition.code, definition.name, definition.description, JSON.stringify(definition.permissions)],
        );
      }

      await queryRunner.query(
        `
          UPDATE "tenant_memberships"
          SET "roleId" = $1, "role" = $2
          WHERE "tenantId" = $3 AND "roleId" IS NULL
        `,
        [roleId, ADMINISTRATOR_ROLE_CODE, tenant.id],
      );

      const normalizedPlan = normalizePlanCode(tenant.plan);
      if (normalizedPlan !== tenant.plan) {
        await queryRunner.query(`UPDATE "tenants" SET "plan" = $1 WHERE "id" = $2`, [normalizedPlan, tenant.id]);
      }
    }

    const existingPlans = (await queryRunner.query(`SELECT "id", "code" FROM "subscription_plans"`)) as Array<{
      id: string;
      code: string;
    }>;

    for (const definition of Object.values(PLAN_ACCESS_DEFINITIONS)) {
      const existing = existingPlans.find((plan) => normalizePlanCode(plan.code) === definition.code);
      if (existing) {
        await queryRunner.query(
          `
            UPDATE "subscription_plans"
            SET "code" = $1,
                "name" = $2,
                "description" = $3,
                "tenantModules" = $4::jsonb,
                "metadata" = $5::jsonb,
                "isActive" = true,
                "updatedAt" = now()
            WHERE "id" = $6
          `,
          [
            definition.code,
            definition.name,
            definition.description,
            JSON.stringify(definition.modules),
            JSON.stringify(getPlanMetadata(definition.code)),
            existing.id,
          ],
        );
        continue;
      }

      await queryRunner.query(
        `
          INSERT INTO "subscription_plans" (
            "id", "code", "name", "description", "isActive", "tenantModules", "platformModules", "metadata", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, true, $5::jsonb, $6::jsonb, $7::jsonb, now(), now())
        `,
        [
          randomUUID(),
          definition.code,
          definition.name,
          definition.description,
          JSON.stringify(definition.modules),
          JSON.stringify(['platform.tenants', 'platform.users', 'platform.plans']),
          JSON.stringify(getPlanMetadata(definition.code)),
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant_memberships" DROP CONSTRAINT IF EXISTS "FK_tenant_memberships_role"`);
    await queryRunner.query(`ALTER TABLE "tenant_memberships" DROP COLUMN IF EXISTS "roleId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_roles_tenant_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_roles"`);
  }
}
