import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RefreshTokenEntity } from './refresh-token.entity';
import { TenantMembershipEntity } from './tenant-membership.entity';

@Entity('admin_users')
export class AdminUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 160 })
  fullName!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetRequestedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpiresAt!: Date | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isPlatformAdmin!: boolean;

  @Column({ length: 40, default: 'tenant_admin' })
  platformRole!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => TenantMembershipEntity, (membership) => membership.user)
  memberships!: TenantMembershipEntity[];

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user)
  refreshTokens!: RefreshTokenEntity[];
}
