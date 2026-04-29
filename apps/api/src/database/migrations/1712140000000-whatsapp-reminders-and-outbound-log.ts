import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappRemindersAndOutboundLog1712140000000 implements MigrationInterface {
  name = 'WhatsappRemindersAndOutboundLog1712140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "whatsappReminderEnabled" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "whatsappReminderMonthlyQuota" integer NOT NULL DEFAULT 100
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_outbound_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "appointmentId" uuid NULL REFERENCES "appointments"("id") ON DELETE SET NULL,
        "channel" character varying(40) NOT NULL DEFAULT 'appointment_reminder',
        "toPhone" character varying(32) NOT NULL,
        "templateName" character varying(128) NOT NULL,
        "languageCode" character varying(16) NOT NULL,
        "bodyParams" jsonb NULL,
        "renderedPreview" text NULL,
        "graphMessageId" character varying(128) NULL,
        "status" character varying(16) NOT NULL,
        "errorMessage" text NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_outbound_logs_tenant_created"
      ON "whatsapp_outbound_logs" ("tenantId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_outbound_logs_tenant_status_created"
      ON "whatsapp_outbound_logs" ("tenantId", "status", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_outbound_logs"`);
    await queryRunner.query(
      `ALTER TABLE "tenant_settings" DROP COLUMN IF EXISTS "whatsappReminderMonthlyQuota"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_settings" DROP COLUMN IF EXISTS "whatsappReminderEnabled"`,
    );
  }
}
