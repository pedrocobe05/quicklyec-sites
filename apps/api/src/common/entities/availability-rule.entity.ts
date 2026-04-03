import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StaffEntity } from './staff.entity';
import { TenantEntity } from './tenant.entity';

@Entity('availability_rules')
export class AvailabilityRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column('uuid', { nullable: true })
  staffId!: string | null;

  @Column({ type: 'int' })
  dayOfWeek!: number;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({ type: 'int', default: 30 })
  slotIntervalMinutes!: number;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.availabilityRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @ManyToOne(() => StaffEntity, (staff) => staff.availabilityRules, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'staffId' })
  staff!: StaffEntity | null;
}
