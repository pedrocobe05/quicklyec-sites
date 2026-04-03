import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformAdminAndPlans1711930000000 implements MigrationInterface {
  name = 'PlatformAdminAndPlans1711930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD COLUMN IF NOT EXISTS "isPlatformAdmin" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD COLUMN IF NOT EXISTS "platformRole" varchar(40) NOT NULL DEFAULT 'tenant_admin'
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_memberships"
      ADD COLUMN IF NOT EXISTS "allowedModules" jsonb NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_memberships"
      ADD COLUMN IF NOT EXISTS "permissions" jsonb NULL
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscription_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(60) NOT NULL UNIQUE,
        "name" varchar(120) NOT NULL,
        "description" varchar(255) NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "tenantModules" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "platformModules" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "metadata" jsonb NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans"`);
    await queryRunner.query(`ALTER TABLE "tenant_memberships" DROP COLUMN IF EXISTS "permissions"`);
    await queryRunner.query(`ALTER TABLE "tenant_memberships" DROP COLUMN IF EXISTS "allowedModules"`);
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "platformRole"`);
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "isPlatformAdmin"`);
  }
}
