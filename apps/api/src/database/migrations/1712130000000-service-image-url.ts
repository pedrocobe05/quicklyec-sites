import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceImageUrl1712130000000 implements MigrationInterface {
  name = 'ServiceImageUrl1712130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "services"
      ADD COLUMN IF NOT EXISTS "imageUrl" varchar(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN IF EXISTS "imageUrl"`);
  }
}
