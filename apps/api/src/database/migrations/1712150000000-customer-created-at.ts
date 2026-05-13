import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerCreatedAt1712150000000 implements MigrationInterface {
  name = 'CustomerCreatedAt1712150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN IF EXISTS "createdAt"`);
  }
}
