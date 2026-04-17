import { MigrationInterface, QueryRunner } from 'typeorm';

export class PayphoneTransactionsAndTokenText1712070000000 implements MigrationInterface {
  name = 'PayphoneTransactionsAndTokenText1712070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ALTER COLUMN "payphoneToken" TYPE text
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payphone_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "clientTransactionId" character varying(64) NOT NULL,
        "payphoneTransactionId" integer,
        "status" character varying(24) NOT NULL DEFAULT 'pending',
        "paymentMethod" character varying(16) NOT NULL DEFAULT 'payphone',
        "amount" integer NOT NULL,
        "currency" character varying(8) NOT NULL DEFAULT 'USD',
        "responseUrl" character varying(255) NOT NULL,
        "cancellationUrl" character varying(255),
        "reference" character varying(255),
        "customerEmail" character varying(255),
        "customerPhone" character varying(40),
        "customerDocumentId" character varying(60),
        "bookingPayload" jsonb NOT NULL,
        "prepareResponse" jsonb,
        "confirmResponse" jsonb,
        "appointmentId" uuid,
        "confirmedAt" timestamptz,
        "errorMessage" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payphone_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payphone_transactions_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payphone_transactions_appointment" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payphone_transactions_tenant_client_tx"
      ON "payphone_transactions" ("tenantId", "clientTransactionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payphone_transactions_tenant_client_tx"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payphone_transactions"`);
    await queryRunner.query(`
      ALTER TABLE "tenant_settings"
      ALTER COLUMN "payphoneToken" TYPE character varying(255)
    `);
  }
}
