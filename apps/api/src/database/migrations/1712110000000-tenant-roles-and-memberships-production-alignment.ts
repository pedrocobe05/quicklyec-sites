import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  DEFAULT_TENANT_ROLE_DEFINITIONS,
  resolveTenantMembershipAccess,
} from '../../modules/tenants/tenant-access.constants';

/**
 * Alineación de producción con la política actual de roles/permisos:
 * - Roles de sistema `administrator` y `staff` por tenant (nombre, descripción, permisos canónicos).
 * - Corrección de `tenant_memberships.role` / `roleId` heredados o erróneos (p. ej. códigos de cuenta de plataforma en la columna de rol de empresa).
 * - Recalculo de `permissions` y `allowedModules` en membresías según plan + rol (misma lógica que `resolveTenantMembershipAccess`).
 *
 * No revierte cambios de esquema; el `down` solo documenta la limitación.
 */
export class TenantRolesAndMembershipsProductionAlignment1712110000000 implements MigrationInterface {
  name = 'TenantRolesAndMembershipsProductionAlignment1712110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureSystemRolesPerTenant(queryRunner);
    await this.fixMembershipRoleColumns(queryRunner);
    await this.refreshMembershipAccessFromPlanAndRole(queryRunner);
  }

  /** Inserta o actualiza filas de `tenant_roles` para códigos de sistema en cada tenant. */
  private async ensureSystemRolesPerTenant(queryRunner: QueryRunner): Promise<void> {
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
            [definition.name, definition.description, JSON.stringify([...definition.permissions]), existingRole.id],
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
            JSON.stringify([...definition.permissions]),
          ],
        );
      }
    }
  }

  /**
   * Asigna `administrator` cuando el código almacenado no es un rol de empresa válido.
   * Enlaza `roleId` cuando la columna `role` es staff|administrator pero faltaba FK.
   */
  private async fixMembershipRoleColumns(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tenant_memberships" m
      SET
        "roleId" = ar."id",
        role = 'administrator'
      FROM "tenant_roles" ar
      WHERE m."tenantId" = ar."tenantId"
        AND ar.code = 'administrator'
        AND (
          m.role IN ('tenant_admin', 'super_admin')
          OR m.role = 'owner'
        )
    `);

    await queryRunner.query(`
      UPDATE "tenant_memberships" m
      SET "roleId" = r."id"
      FROM "tenant_roles" r
      WHERE m."tenantId" = r."tenantId"
        AND r.code = m.role
        AND m."roleId" IS NULL
        AND m.role IN ('administrator', 'staff')
    `);

    await queryRunner.query(`
      UPDATE "tenant_memberships" m
      SET role = r.code
      FROM "tenant_roles" r
      WHERE m."roleId" = r."id"
        AND m.role IS DISTINCT FROM r.code
    `);
  }

  /** Igual que al guardar membresía / login: intersección plan × permisos del rol. */
  private async refreshMembershipAccessFromPlanAndRole(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT m."id", t."plan" AS "tenantPlan", r."permissions" AS "rolePermissions"
      FROM "tenant_memberships" m
      INNER JOIN "tenants" t ON t."id" = m."tenantId"
      INNER JOIN "tenant_roles" r ON r."id" = m."roleId"
      WHERE m."roleId" IS NOT NULL
    `)) as Array<{
      id: string;
      tenantPlan: string | null;
      rolePermissions: string[] | unknown;
    }>;

    for (const row of rows) {
      const rolePerms = Array.isArray(row.rolePermissions)
        ? (row.rolePermissions as string[])
        : typeof row.rolePermissions === 'string'
          ? (JSON.parse(row.rolePermissions) as string[])
          : [];

      const access = resolveTenantMembershipAccess(row.tenantPlan, rolePerms);

      const permissionsJson = access.permissions.length > 0 ? JSON.stringify(access.permissions) : null;
      const allowedJson = access.allowedModules.length > 0 ? JSON.stringify(access.allowedModules) : null;

      await queryRunner.query(
        `
          UPDATE "tenant_memberships"
          SET
            "permissions" = $1::jsonb,
            "allowedModules" = $2::jsonb
          WHERE "id" = $3
        `,
        [permissionsJson, allowedJson, row.id],
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Migración de datos: no hay reversión segura sin backup previo.
  }
}
