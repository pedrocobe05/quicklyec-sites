import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AdminUserEntity } from './admin-user.entity';
import { TenantEntity } from './tenant.entity';
import { TenantRoleEntity } from './tenant-role.entity';

@Entity('tenant_memberships')
export class TenantMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ length: 40, default: 'owner' })
  role!: string;

  @Column('uuid', { nullable: true })
  roleId!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  allowedModules!: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  permissions!: string[] | null;

  @ManyToOne(() => AdminUserEntity, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: AdminUserEntity;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @ManyToOne(() => TenantRoleEntity, (role) => role.memberships, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'roleId' })
  roleDefinition!: TenantRoleEntity | null;
}
