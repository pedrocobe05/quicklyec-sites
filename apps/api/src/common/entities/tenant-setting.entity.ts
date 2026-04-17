import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity('tenant_settings')
export class TenantSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ default: true })
  publicSiteEnabled!: boolean;

  @Column({ default: true })
  bookingEnabled!: boolean;

  @Column({ length: 80, default: 'America/Guayaquil' })
  timezone!: string;

  @Column({ length: 16, default: 'es-EC' })
  locale!: string;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ default: true })
  cashPaymentEnabled!: boolean;

  @Column({ default: false })
  transferPaymentEnabled!: boolean;

  @Column({ default: false })
  payphonePaymentEnabled!: boolean;

  @Column({ length: 16, default: 'redirect' })
  payphoneMode!: string;

  @Column({ type: 'varchar', nullable: true, length: 120 })
  payphoneStoreId!: string | null;

  @Column({ type: 'text', nullable: true })
  payphoneToken!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  contactEmail!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 40 })
  contactPhone!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 40 })
  whatsappNumber!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  contactAddress!: string | null;

  @Column({ default: true })
  siteIndexingEnabled!: boolean;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  defaultSeoTitle!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 300 })
  defaultSeoDescription!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  defaultOgImageUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  canonicalDomain!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  mailConfig!: Record<string, unknown> | null;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;
}
