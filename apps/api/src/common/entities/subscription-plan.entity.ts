import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 60, unique: true })
  code!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tenantModules!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  platformModules!: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
