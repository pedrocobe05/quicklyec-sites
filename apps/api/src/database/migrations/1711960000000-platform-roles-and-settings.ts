import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class PlatformRolesAndSettings1711960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(60) NOT NULL,
        "name" varchar(120) NOT NULL,
        "description" varchar(255),
        "isSystem" boolean NOT NULL DEFAULT true,
        "isActive" boolean NOT NULL DEFAULT true,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_platform_roles_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "platformName" varchar(160) NOT NULL DEFAULT 'Quickly Sites',
        "supportEmail" varchar(255),
        "supportPhone" varchar(40),
        "publicAppUrl" varchar(255),
        "quicklysitesBaseDomain" varchar(160),
        "defaultSenderName" varchar(160),
        "defaultSenderEmail" varchar(255),
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_settings_id" PRIMARY KEY ("id")
      )
    `);

    const existingRole = (await queryRunner.query(`SELECT "id" FROM "platform_roles" WHERE "code" = 'super_admin' LIMIT 1`))?.[0];
    if (!existingRole) {
      await queryRunner.query(
        `
          INSERT INTO "platform_roles" (
            "id", "code", "name", "description", "isSystem", "isActive", "permissions", "createdAt", "updatedAt"
          ) VALUES ($1, 'super_admin', 'Super administrador', 'Acceso total a la plataforma', true, true, $2::jsonb, now(), now())
        `,
        [randomUUID(), JSON.stringify(['platform.users', 'platform.roles', 'platform.tenants', 'platform.settings'])],
      );
    }

    const existingSetting = (await queryRunner.query(`SELECT "id" FROM "platform_settings" LIMIT 1`))?.[0];
    if (!existingSetting) {
      await queryRunner.query(
        `
          INSERT INTO "platform_settings" (
            "id", "platformName", "supportEmail", "supportPhone", "publicAppUrl", "quicklysitesBaseDomain", "defaultSenderName", "defaultSenderEmail", "metadata", "createdAt", "updatedAt"
          ) VALUES ($1, 'Quickly Sites', 'sites@quicklyec.com', NULL, 'http://localhost:5174', 'quicklysites.local', 'Quickly Sites', 'sites@quicklyec.com', NULL, now(), now())
        `,
        [randomUUID()],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_roles"`);
  }
}
