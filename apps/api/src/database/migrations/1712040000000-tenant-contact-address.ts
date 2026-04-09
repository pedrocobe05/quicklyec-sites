import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantContactAddress1712040000000 implements MigrationInterface {
  name = 'TenantContactAddress1712040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "contactAddress" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      DROP COLUMN IF EXISTS "contactAddress"
    `);
  }
}
