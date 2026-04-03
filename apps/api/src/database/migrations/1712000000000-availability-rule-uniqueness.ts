import { MigrationInterface, QueryRunner } from 'typeorm';

export class AvailabilityRuleUniqueness1712000000000 implements MigrationInterface {
  name = 'AvailabilityRuleUniqueness1712000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "availability_rules" ar
      USING (
        SELECT
          ctid,
          ROW_NUMBER() OVER (
            PARTITION BY
              "tenantId",
              COALESCE("staffId", '00000000-0000-0000-0000-000000000000'::uuid),
              "dayOfWeek",
              "startTime",
              "endTime",
              "slotIntervalMinutes"
            ORDER BY ctid
          ) AS duplicate_rank
        FROM "availability_rules"
      ) duplicates
      WHERE ar.ctid = duplicates.ctid
        AND duplicates.duplicate_rank > 1
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_availability_rules_unique_slot"
      ON "availability_rules" (
        "tenantId",
        COALESCE("staffId", '00000000-0000-0000-0000-000000000000'::uuid),
        "dayOfWeek",
        "startTime",
        "endTime",
        "slotIntervalMinutes"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_availability_rules_unique_slot"`);
  }
}
