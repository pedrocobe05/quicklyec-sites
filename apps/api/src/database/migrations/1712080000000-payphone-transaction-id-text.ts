import { MigrationInterface, QueryRunner } from 'typeorm';

export class PayphoneTransactionIdText1712080000000 implements MigrationInterface {
  name = 'PayphoneTransactionIdText1712080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payphone_transactions"
      ALTER COLUMN "payphoneTransactionId" TYPE text
      USING "payphoneTransactionId"::text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payphone_transactions"
      ALTER COLUMN "payphoneTransactionId" TYPE integer
      USING NULLIF("payphoneTransactionId", '')::integer
    `);
  }
}
