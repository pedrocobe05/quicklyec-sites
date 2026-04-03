import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { TenantMembershipEntity } from './tenant-membership.entity';

@Entity('tenant_roles')
export class TenantRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ length: 60 })
  code!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ default: true })
  isSystem!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  permissions!: string[];

  @ManyToOne(() => TenantEntity, (tenant) => tenant.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @OneToMany(() => TenantMembershipEntity, (membership) => membership.roleDefinition)
  memberships!: TenantMembershipEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
