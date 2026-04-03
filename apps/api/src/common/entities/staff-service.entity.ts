import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ServiceEntity } from './service.entity';
import { StaffEntity } from './staff.entity';

@Entity('staff_services')
export class StaffServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  staffId!: string;

  @Column('uuid')
  serviceId!: string;

  @ManyToOne(() => StaffEntity, (staff) => staff.staffServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff!: StaffEntity;

  @ManyToOne(() => ServiceEntity, (service) => service.staffServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceId' })
  service!: ServiceEntity;
}
