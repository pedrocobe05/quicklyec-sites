import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { StaffServiceEntity } from './staff-service.entity';
import { TenantEntity } from './tenant.entity';
import { AppointmentEntity } from './appointment.entity';

@Entity('services')
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ length: 160 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'int' })
  durationMinutes!: number;

  @Column({ type: 'numeric', nullable: true })
  price!: number | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', nullable: true, length: 80 })
  category!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  color!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  imageUrl!: string | null;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @OneToMany(() => StaffServiceEntity, (staffService) => staffService.service)
  staffServices!: StaffServiceEntity[];

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.service)
  appointments!: AppointmentEntity[];
}
