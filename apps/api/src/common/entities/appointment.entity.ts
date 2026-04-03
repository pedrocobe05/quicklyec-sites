import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { ServiceEntity } from './service.entity';
import { StaffEntity } from './staff.entity';
import { TenantEntity } from './tenant.entity';

@Entity('appointments')
export class AppointmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column('uuid')
  customerId!: string;

  @Column('uuid')
  serviceId!: string;

  @Column('uuid', { nullable: true })
  staffId!: string | null;

  @Column({ length: 32, default: 'public_site' })
  source!: string;

  @Column({ length: 32, default: 'pending' })
  status!: string;

  @Column({ type: 'timestamptz' })
  startDateTime!: Date;

  @Column({ type: 'timestamptz' })
  endDateTime!: Date;

  @Column({ nullable: true, type: 'text' })
  notes!: string | null;

  @Column({ nullable: true, type: 'text' })
  internalNotes!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reminderScheduledAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reminderSentAt!: Date | null;

  @Column({ nullable: true, type: 'text' })
  reminderError!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @ManyToOne(() => CustomerEntity, (customer) => customer.appointments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: CustomerEntity;

  @ManyToOne(() => ServiceEntity, (service) => service.appointments)
  @JoinColumn({ name: 'serviceId' })
  service!: ServiceEntity;

  @ManyToOne(() => StaffEntity, (staff) => staff.appointments, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'staffId' })
  staff!: StaffEntity | null;
}
