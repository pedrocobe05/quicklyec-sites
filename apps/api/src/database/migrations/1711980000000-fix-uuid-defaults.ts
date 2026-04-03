import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUuidDefaults1711980000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`ALTER TABLE "tenant_roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
    await queryRunner.query(`ALTER TABLE "platform_roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
    await queryRunner.query(`ALTER TABLE "platform_settings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant_roles" ALTER COLUMN "id" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "platform_roles" ALTER COLUMN "id" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "platform_settings" ALTER COLUMN "id" DROP DEFAULT`);
  }
}
