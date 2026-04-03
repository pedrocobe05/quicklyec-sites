import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AppointmentEntity } from './appointment.entity';
import { TenantEntity } from './tenant.entity';

@Entity('customers')
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ length: 160 })
  fullName!: string;

  @Column({ length: 255 })
  email!: string;

  @Column({ length: 40 })
  phone!: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  identification!: string | null;

  @Column({ nullable: true, type: 'text' })
  notes!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tags!: Record<string, unknown> | null;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.customers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.customer)
  appointments!: AppointmentEntity[];
}
