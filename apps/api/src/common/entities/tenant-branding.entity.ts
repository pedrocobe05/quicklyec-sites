import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity('tenant_branding')
export class TenantBrandingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  logoUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  faviconUrl!: string | null;

  @Column({ length: 20, default: '#D89AA5' })
  primaryColor!: string;

  @Column({ length: 20, default: '#F5E8EA' })
  secondaryColor!: string;

  @Column({ length: 20, default: '#A86172' })
  accentColor!: string;

  @Column({ length: 120, default: 'Playfair Display' })
  fontFamily!: string;

  @Column({ length: 24, default: '1rem' })
  borderRadius!: string;

  @Column({ length: 24, default: 'rounded' })
  buttonStyle!: string;

  @Column({ nullable: true, type: 'text' })
  customCss!: string | null;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.branding, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;
}
