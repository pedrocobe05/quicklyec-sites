import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { StaffServiceEntity } from './staff-service.entity';
import { AvailabilityRuleEntity } from './availability-rule.entity';
import { ScheduleBlockEntity } from './schedule-block.entity';
import { AppointmentEntity } from './appointment.entity';

@Entity('staff')
export class StaffEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  email!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 40 })
  phone!: string | null;

  @Column({ default: true })
  isBookable!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @OneToMany(() => StaffServiceEntity, (staffService) => staffService.staff)
  staffServices!: StaffServiceEntity[];

  @OneToMany(() => AvailabilityRuleEntity, (rule) => rule.staff)
  availabilityRules!: AvailabilityRuleEntity[];

  @OneToMany(() => ScheduleBlockEntity, (block) => block.staff)
  scheduleBlocks!: ScheduleBlockEntity[];

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.staff)
  appointments!: AppointmentEntity[];
}
