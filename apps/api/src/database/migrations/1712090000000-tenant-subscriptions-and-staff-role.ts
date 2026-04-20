import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

const ADMINISTRATOR_ROLE_CODE = 'administrator';
const STAFF_ROLE_CODE = 'staff';

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
] as const;

const STAFF_ROLE_PERMISSIONS = [
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

const DEFAULT_TENANT_ROLE_DEFINITIONS = [
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

export class TenantSubscriptionsAndStaffRole1712090000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "subscriptionStartsAt" date NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" date NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "subscriptionAlertState" jsonb NULL
    `);

    const tenants = (await queryRunner.query(`SELECT "id" FROM "tenants"`)) as Array<{ id: string }>;

    for (const tenant of tenants) {
      for (const definition of DEFAULT_TENANT_ROLE_DEFINITIONS) {
        const existingRole = (
          await queryRunner.query(
            `SELECT "id" FROM "tenant_roles" WHERE "tenantId" = $1 AND "code" = $2 LIMIT 1`,
            [tenant.id, definition.code],
          )
        )?.[0] as { id: string } | undefined;

        if (existingRole) {
          await queryRunner.query(
            `
              UPDATE "tenant_roles"
              SET "name" = $1,
                  "description" = $2,
                  "isSystem" = true,
                  "isActive" = true,
                  "permissions" = $3::jsonb,
                  "updatedAt" = now()
              WHERE "id" = $4
            `,
            [definition.name, definition.description, JSON.stringify(definition.permissions), existingRole.id],
          );
          continue;
        }

        await queryRunner.query(
          `
            INSERT INTO "tenant_roles" (
              "id", "tenantId", "code", "name", "description", "isSystem", "isActive", "permissions", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, true, true, $6::jsonb, now(), now())
          `,
          [
            randomUUID(),
            tenant.id,
            definition.code,
            definition.name,
            definition.description,
            JSON.stringify(definition.permissions),
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "tenant_roles" WHERE "code" = '${STAFF_ROLE_CODE}'`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "subscriptionAlertState"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "subscriptionEndsAt"`);
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "subscriptionStartsAt"`);
  }
}
