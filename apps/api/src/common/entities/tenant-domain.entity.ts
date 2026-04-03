import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity('tenant_domains')
export class TenantDomainEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ unique: true, length: 255 })
  domain!: string;

  @Column({ length: 32 })
  type!: string;

  @Column({ default: false })
  isPrimary!: boolean;

  @Column({ length: 32, default: 'pending' })
  verificationStatus!: string;

  @Column({ nullable: true, type: 'timestamptz' })
  verifiedAt!: Date | null;

  @Column({ length: 32, default: 'pending' })
  sslStatus!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.domains, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;
}
