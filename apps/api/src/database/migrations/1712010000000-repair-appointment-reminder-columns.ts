import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairAppointmentReminderColumns1712010000000 implements MigrationInterface {
  name = 'RepairAppointmentReminderColumns1712010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminderScheduledAt" timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminderSentAt" timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminderError" text NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminderError"`);
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminderSentAt"`);
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminderScheduledAt"`);
  }
}
