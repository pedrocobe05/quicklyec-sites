import { MigrationInterface, QueryRunner } from 'typeorm';

export class FilesAndAppointmentReminders1711990000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "file_objects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "storageKey" varchar(255) NOT NULL,
        "filename" varchar(160) NOT NULL,
        "contentType" varchar(120) NOT NULL,
        "sizeBytes" integer NOT NULL DEFAULT 0,
        "provider" varchar(80) NOT NULL DEFAULT 's3',
        "visibility" varchar(80) NOT NULL DEFAULT 'private',
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_file_objects_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_file_objects_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_file_objects_tenant_storage_key"
      ON "file_objects" ("tenantId", "storageKey")
    `);

    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminderScheduledAt" timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminderSentAt" timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminderError" text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminderError"`);
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminderSentAt"`);
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminderScheduledAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_file_objects_tenant_storage_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "file_objects"`);
  }
}
