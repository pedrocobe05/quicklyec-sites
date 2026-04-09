import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminUserPasswordReset1712050000000 implements MigrationInterface {
  name = 'AdminUserPasswordReset1712050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD COLUMN IF NOT EXISTS "passwordResetTokenHash" character varying(255)
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD COLUMN IF NOT EXISTS "passwordResetRequestedAt" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_users"
      ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "passwordResetExpiresAt"`);
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "passwordResetRequestedAt"`);
    await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN IF EXISTS "passwordResetTokenHash"`);
  }
}
