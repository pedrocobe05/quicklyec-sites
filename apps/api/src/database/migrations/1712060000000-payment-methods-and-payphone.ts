import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentMethodsAndPayphone1712060000000 implements MigrationInterface {
  name = 'PaymentMethodsAndPayphone1712060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "cashPaymentEnabled" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "transferPaymentEnabled" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "payphonePaymentEnabled" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "payphoneMode" character varying(16) NOT NULL DEFAULT 'redirect'
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "payphoneStoreId" character varying(120)
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ADD COLUMN IF NOT EXISTS "payphoneToken" character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD COLUMN IF NOT EXISTS "paymentMethod" character varying(16) NOT NULL DEFAULT 'cash'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "paymentMethod"`);
    await queryRunner.query(`ALTER TABLE "tenant_settings" DROP COLUMN IF EXISTS "payphoneToken"`);
    await queryRunner.query(`ALTER TABLE "tenant_settings" DROP COLUMN IF EXISTS "payphoneStoreId"`);
    await queryRunner.query(`ALTER TABLE "tenant_settings" DROP COLUMN IF EXISTS "payphoneMode"`);
    await queryRunner.query(`ALTER TABLE "tenant_settings" DROP COLUMN IF EXISTS "payphonePaymentEnabled"`);
    await queryRunner.query(`ALTER TABLE "tenant_settings" DROP COLUMN IF EXISTS "transferPaymentEnabled"`);
    await queryRunner.query(`ALTER TABLE "tenant_settings" DROP COLUMN IF EXISTS "cashPaymentEnabled"`);
  }
}
