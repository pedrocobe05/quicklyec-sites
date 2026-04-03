import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711920000000 implements MigrationInterface {
  name = 'InitialSchema1711920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "slug" varchar(120) NOT NULL UNIQUE,
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "plan" varchar(24) NOT NULL DEFAULT 'starter',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_domains" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "domain" varchar(255) NOT NULL UNIQUE,
        "type" varchar(32) NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "verificationStatus" varchar(32) NOT NULL DEFAULT 'pending',
        "verifiedAt" timestamptz NULL,
        "sslStatus" varchar(32) NOT NULL DEFAULT 'pending',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "publicSiteEnabled" boolean NOT NULL DEFAULT true,
        "bookingEnabled" boolean NOT NULL DEFAULT true,
        "timezone" varchar(80) NOT NULL DEFAULT 'America/Guayaquil',
        "locale" varchar(16) NOT NULL DEFAULT 'es-EC',
        "currency" varchar(8) NOT NULL DEFAULT 'USD',
        "contactEmail" varchar(255) NULL,
        "contactPhone" varchar(40) NULL,
        "whatsappNumber" varchar(40) NULL,
        "siteIndexingEnabled" boolean NOT NULL DEFAULT true,
        "defaultSeoTitle" varchar(255) NULL,
        "defaultSeoDescription" varchar(300) NULL,
        "defaultOgImageUrl" varchar(500) NULL,
        "canonicalDomain" varchar(255) NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_branding" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "logoUrl" varchar(500) NULL,
        "faviconUrl" varchar(500) NULL,
        "primaryColor" varchar(20) NOT NULL DEFAULT '#D89AA5',
        "secondaryColor" varchar(20) NOT NULL DEFAULT '#F5E8EA',
        "accentColor" varchar(20) NOT NULL DEFAULT '#A86172',
        "fontFamily" varchar(120) NOT NULL DEFAULT 'Playfair Display',
        "borderRadius" varchar(24) NOT NULL DEFAULT '1rem',
        "buttonStyle" varchar(24) NOT NULL DEFAULT 'rounded',
        "customCss" text NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "site_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(80) NOT NULL UNIQUE,
        "name" varchar(120) NOT NULL,
        "description" varchar(255) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "site_pages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "templateId" uuid NOT NULL REFERENCES "site_templates"("id"),
        "slug" varchar(120) NOT NULL,
        "title" varchar(160) NOT NULL,
        "isHome" boolean NOT NULL DEFAULT false,
        "isPublished" boolean NOT NULL DEFAULT false,
        "isIndexable" boolean NOT NULL DEFAULT true,
        "seoTitle" varchar(255) NULL,
        "seoDescription" varchar(320) NULL,
        "canonicalUrl" varchar(500) NULL,
        "ogTitle" varchar(255) NULL,
        "ogDescription" varchar(320) NULL,
        "ogImageUrl" varchar(500) NULL,
        "metaRobots" varchar(120) NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "site_sections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "pageId" uuid NOT NULL REFERENCES "site_pages"("id") ON DELETE CASCADE,
        "type" varchar(64) NOT NULL,
        "variant" varchar(64) NOT NULL,
        "position" int NOT NULL,
        "isVisible" boolean NOT NULL DEFAULT true,
        "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "content" jsonb NOT NULL DEFAULT '{}'::jsonb
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(160) NOT NULL,
        "description" text NOT NULL,
        "durationMinutes" int NOT NULL,
        "price" numeric NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "category" varchar(80) NULL,
        "color" varchar(20) NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "staff" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "name" varchar(120) NOT NULL,
        "bio" text NULL,
        "avatarUrl" varchar(500) NULL,
        "email" varchar(255) NULL,
        "phone" varchar(40) NULL,
        "isBookable" boolean NOT NULL DEFAULT true,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "staff_services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "staffId" uuid NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
        "serviceId" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "availability_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "staffId" uuid NULL REFERENCES "staff"("id") ON DELETE SET NULL,
        "dayOfWeek" int NOT NULL,
        "startTime" time NOT NULL,
        "endTime" time NOT NULL,
        "slotIntervalMinutes" int NOT NULL DEFAULT 30,
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "schedule_blocks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "staffId" uuid NULL REFERENCES "staff"("id") ON DELETE SET NULL,
        "startDateTime" timestamptz NOT NULL,
        "endDateTime" timestamptz NOT NULL,
        "reason" varchar(255) NOT NULL,
        "blockType" varchar(64) NOT NULL DEFAULT 'manual'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "fullName" varchar(160) NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(40) NOT NULL,
        "notes" text NULL,
        "tags" jsonb NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "customerId" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "serviceId" uuid NOT NULL REFERENCES "services"("id"),
        "staffId" uuid NULL REFERENCES "staff"("id") ON DELETE SET NULL,
        "source" varchar(32) NOT NULL DEFAULT 'public_site',
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "startDateTime" timestamptz NOT NULL,
        "endDateTime" timestamptz NOT NULL,
        "notes" text NULL,
        "internalNotes" text NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "admin_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "fullName" varchar(160) NOT NULL,
        "email" varchar(255) NOT NULL UNIQUE,
        "passwordHash" varchar(255) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_memberships" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE,
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "role" varchar(40) NOT NULL DEFAULT 'owner',
        "isActive" boolean NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE,
        "tokenHash" varchar(255) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_memberships"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schedule_blocks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "availability_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "site_sections"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "site_pages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "site_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_branding"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_domains"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
  }
}
