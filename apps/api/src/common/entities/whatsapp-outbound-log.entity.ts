import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AppointmentEntity } from './appointment.entity';
import { TenantEntity } from './tenant.entity';

@Entity('whatsapp_outbound_logs')
export class WhatsappOutboundLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column('uuid', { nullable: true })
  appointmentId!: string | null;

  @Column({ type: 'varchar', length: 40, default: 'appointment_reminder' })
  channel!: string;

  @Column({ type: 'varchar', length: 32 })
  toPhone!: string;

  @Column({ type: 'varchar', length: 128 })
  templateName!: string;

  @Column({ type: 'varchar', length: 16 })
  languageCode!: string;

  @Column({ type: 'jsonb', nullable: true })
  bodyParams!: string[] | null;

  @Column({ type: 'text', nullable: true })
  renderedPreview!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  graphMessageId!: string | null;

  /** Valores esperados en app: sent | failed (varchar para evitar metadata Object en PG). */
  @Column({ type: 'varchar', length: 16 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @ManyToOne(() => AppointmentEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appointmentId' })
  appointment!: AppointmentEntity | null;
}
