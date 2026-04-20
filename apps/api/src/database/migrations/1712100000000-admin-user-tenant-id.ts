import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminUserTenantId1712100000000 implements MigrationInterface {
  name = 'AdminUserTenantId1712100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD COLUMN IF NOT EXISTS "tenantId" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_users"
      DROP CONSTRAINT IF EXISTS "FK_admin_users_tenant"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD CONSTRAINT "FK_admin_users_tenant"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL
    `);

    // Postgres no tiene MIN(uuid); para usuarios con una sola membresía basta el join directo.
    await queryRunner.query(`
      UPDATE "admin_users" u
      SET "tenantId" = m."tenantId"
      FROM "tenant_memberships" m
      WHERE m."userId" = u.id
        AND u."isPlatformAdmin" = false
        AND u."tenantId" IS NULL
        AND (
          SELECT COUNT(*)::int FROM "tenant_memberships" m2 WHERE m2."userId" = u.id
        ) = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_users" DROP CONSTRAINT IF EXISTS "FK_admin_users_tenant"`);
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "tenantId"`);
  }
}
