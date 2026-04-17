import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { AppointmentEntity } from './appointment.entity';

export type PayphoneTransactionStatus = 'pending' | 'approved' | 'cancelled' | 'failed';

@Entity('payphone_transactions')
export class PayphoneTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ type: 'varchar', length: 64 })
  clientTransactionId!: string;

  @Column({ type: 'text', nullable: true })
  payphoneTransactionId!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status!: PayphoneTransactionStatus;

  @Column({ type: 'varchar', length: 16, default: 'payphone' })
  paymentMethod!: string;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', length: 255 })
  responseUrl!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationUrl!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  customerPhone!: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  customerDocumentId!: string | null;

  @Column({ type: 'jsonb' })
  bookingPayload!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  prepareResponse!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  confirmResponse!: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  appointmentId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @ManyToOne(() => AppointmentEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointmentId' })
  appointment!: AppointmentEntity | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
