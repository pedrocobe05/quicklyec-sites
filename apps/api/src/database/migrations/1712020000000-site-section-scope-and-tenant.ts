import { MigrationInterface, QueryRunner } from 'typeorm';

export class SiteSectionScopeAndTenant1712020000000 implements MigrationInterface {
  name = 'SiteSectionScopeAndTenant1712020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "site_sections"
      ADD COLUMN IF NOT EXISTS "tenantId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "site_sections"
      ADD COLUMN IF NOT EXISTS "scope" character varying(16) NOT NULL DEFAULT 'page'
    `);
    await queryRunner.query(`
      ALTER TABLE "site_sections"
      ALTER COLUMN "pageId" DROP NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "site_sections" s
      SET "tenantId" = p."tenantId"
      FROM "site_pages" p
      WHERE s."pageId" = p."id"
        AND s."tenantId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "site_sections"
      ALTER COLUMN "tenantId" SET NOT NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_site_sections_tenant'
        ) THEN
          ALTER TABLE "site_sections"
          ADD CONSTRAINT "FK_site_sections_tenant"
          FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      INSERT INTO "site_sections" ("id", "tenantId", "pageId", "scope", "type", "variant", "position", "isVisible", "settings", "content")
      SELECT gen_random_uuid(), t."id", NULL, 'global', 'header', 'default', 1, true, '{}'::jsonb,
             jsonb_build_object('title', t."name", 'subtitle', CASE WHEN t."plan" IN ('pro', 'premium', 'enterprise') THEN 'Sitio y reservas online' ELSE 'Sitio informativo del negocio' END)
      FROM "tenants" t
      WHERE NOT EXISTS (
        SELECT 1 FROM "site_sections" s
        WHERE s."tenantId" = t."id" AND s."scope" = 'global' AND s."type" = 'header'
      )
    `);
    await queryRunner.query(`
      INSERT INTO "site_sections" ("id", "tenantId", "pageId", "scope", "type", "variant", "position", "isVisible", "settings", "content")
      SELECT gen_random_uuid(), t."id", NULL, 'global', 'footer', 'default', 2, true, '{}'::jsonb,
             jsonb_build_object('text', t."name" || ' · Powered by Quickly Sites')
      FROM "tenants" t
      WHERE NOT EXISTS (
        SELECT 1 FROM "site_sections" s
        WHERE s."tenantId" = t."id" AND s."scope" = 'global' AND s."type" = 'footer'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "site_sections"
      WHERE "scope" = 'global' AND "type" IN ('header', 'footer')
    `);
    await queryRunner.query(`
      ALTER TABLE "site_sections"
      DROP CONSTRAINT IF EXISTS "FK_site_sections_tenant"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_sections"
      DROP COLUMN IF EXISTS "scope"
    `);
    await queryRunner.query(`
      ALTER TABLE "site_sections"
      DROP COLUMN IF EXISTS "tenantId"
    `);
  }
}
