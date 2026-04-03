import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StaffEntity } from './staff.entity';
import { TenantEntity } from './tenant.entity';

@Entity('schedule_blocks')
export class ScheduleBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column('uuid', { nullable: true })
  staffId!: string | null;

  @Column({ type: 'timestamptz' })
  startDateTime!: Date;

  @Column({ type: 'timestamptz' })
  endDateTime!: Date;

  @Column({ length: 255 })
  reason!: string;

  @Column({ length: 64, default: 'manual' })
  blockType!: string;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.scheduleBlocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @ManyToOne(() => StaffEntity, (staff) => staff.scheduleBlocks, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'staffId' })
  staff!: StaffEntity | null;
}
