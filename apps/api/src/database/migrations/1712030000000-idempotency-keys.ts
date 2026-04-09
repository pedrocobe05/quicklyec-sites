import { MigrationInterface, QueryRunner } from 'typeorm';

export class IdempotencyKeys1712030000000 implements MigrationInterface {
  name = 'IdempotencyKeys1712030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "idempotency_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_scope" character varying(64) NOT NULL,
        "user_scope" character varying(64) NOT NULL,
        "method" character varying(12) NOT NULL,
        "route" character varying(220) NOT NULL,
        "idempotency_key" character varying(160) NOT NULL,
        "request_hash" character varying(64) NOT NULL,
        "status" character varying(24) NOT NULL DEFAULT 'PROCESSING',
        "response_code" integer,
        "response_body" jsonb,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_idempotency_scope_key"
      ON "idempotency_keys" ("tenant_scope", "user_scope", "method", "route", "idempotency_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_idempotency_scope_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);
  }
}
