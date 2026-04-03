import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SitePageEntity } from './site-page.entity';
import { TenantEntity } from './tenant.entity';

@Entity('site_sections')
export class SiteSectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column('uuid', { nullable: true })
  pageId!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'page' })
  scope!: 'global' | 'page';

  @Column({ length: 64 })
  type!: string;

  @Column({ length: 64 })
  variant!: string;

  @Column({ type: 'int' })
  position!: number;

  @Column({ default: true })
  isVisible!: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  settings!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  content!: Record<string, unknown>;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @ManyToOne(() => SitePageEntity, (page) => page.sections, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'pageId' })
  page!: SitePageEntity | null;
}
