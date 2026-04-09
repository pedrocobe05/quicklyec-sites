import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type IdempotencyRequestStatus = 'PROCESSING' | 'COMPLETED';

@Entity({ name: 'idempotency_keys' })
@Index('IDX_idempotency_scope_key', ['tenantScope', 'userScope', 'method', 'route', 'key'], {
  unique: true,
})
export class IdempotencyKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_scope', type: 'varchar', length: 64 })
  tenantScope!: string;

  @Column({ name: 'user_scope', type: 'varchar', length: 64 })
  userScope!: string;

  @Column({ type: 'varchar', length: 12 })
  method!: string;

  @Column({ type: 'varchar', length: 220 })
  route!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 160 })
  key!: string;

  @Column({ name: 'request_hash', type: 'varchar', length: 64 })
  requestHash!: string;

  @Column({ type: 'varchar', length: 24, default: 'PROCESSING' })
  status!: IdempotencyRequestStatus;

  @Column({ name: 'response_code', type: 'int', nullable: true })
  responseCode!: number | null;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody!: Record<string, unknown> | unknown[] | string | number | boolean | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
