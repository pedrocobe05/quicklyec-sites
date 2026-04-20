import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Vincula cada usuario con rol `staff` al registro `staff` (profesional) del mismo tenant
 * para poder filtrar reservas, clientes y agenda solo a su propia actividad.
 */
export class TenantMembershipLinkedStaff1712120000000 implements MigrationInterface {
  name = 'TenantMembershipLinkedStaff1712120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_memberships"
      ADD COLUMN IF NOT EXISTS "linkedStaffId" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_memberships"
      DROP CONSTRAINT IF EXISTS "FK_tenant_memberships_linked_staff"
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_memberships"
      ADD CONSTRAINT "FK_tenant_memberships_linked_staff"
      FOREIGN KEY ("linkedStaffId") REFERENCES "staff"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_memberships_tenant_linked_staff"
      ON "tenant_memberships" ("tenantId", "linkedStaffId")
      WHERE "linkedStaffId" IS NOT NULL
    `);

    // No referenciar el alias del UPDATE en ON del FROM: Postgres lo rechaza (42P01).
    await queryRunner.query(`
      UPDATE "tenant_memberships" m
      SET "linkedStaffId" = sub."staffId"
      FROM (
        SELECT
          m2."id" AS "membershipId",
          s."id" AS "staffId"
        FROM "tenant_memberships" m2
        INNER JOIN "admin_users" u ON u."id" = m2."userId"
        INNER JOIN "tenant_roles" r ON r."id" = m2."roleId"
        INNER JOIN "staff" s ON s."tenantId" = m2."tenantId"
        WHERE r.code = 'staff'
          AND m2."linkedStaffId" IS NULL
          AND s.email IS NOT NULL
          AND TRIM(LOWER(s.email)) = TRIM(LOWER(u.email))
      ) sub
      WHERE m."id" = sub."membershipId"
    `);

    const staffPerms = JSON.stringify([
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
    ]);
    await queryRunner.query(
      `UPDATE "tenant_roles" SET "permissions" = $1::jsonb, "updatedAt" = now() WHERE "code" = 'staff'`,
      [staffPerms],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_memberships_tenant_linked_staff"`);
    await queryRunner.query(`ALTER TABLE "tenant_memberships" DROP CONSTRAINT IF EXISTS "FK_tenant_memberships_linked_staff"`);
    await queryRunner.query(`ALTER TABLE "tenant_memberships" DROP COLUMN IF EXISTS "linkedStaffId"`);
  }
}
