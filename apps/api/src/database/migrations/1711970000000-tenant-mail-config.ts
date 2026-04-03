import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantMailConfig1711970000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "mailConfig" jsonb NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      DROP COLUMN IF EXISTS "mailConfig"
    `);
  }
}
