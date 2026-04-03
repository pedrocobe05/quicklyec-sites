import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerIdentification1711940000000 implements MigrationInterface {
  name = 'CustomerIdentification1711940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "identification" varchar(60) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "identification"
    `);
  }
}
