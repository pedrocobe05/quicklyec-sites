import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SiteTemplateEntity } from './site-template.entity';
import { SiteSectionEntity } from './site-section.entity';
import { TenantEntity } from './tenant.entity';

@Entity('site_pages')
export class SitePageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column('uuid')
  templateId!: string;

  @Column({ length: 120 })
  slug!: string;

  @Column({ length: 160 })
  title!: string;

  @Column({ default: false })
  isHome!: boolean;

  @Column({ default: false })
  isPublished!: boolean;

  @Column({ default: true })
  isIndexable!: boolean;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  seoTitle!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 320 })
  seoDescription!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  canonicalUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  ogTitle!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 320 })
  ogDescription!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  ogImageUrl!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 120 })
  metaRobots!: string | null;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.pages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @ManyToOne(() => SiteTemplateEntity, (template) => template.pages)
  @JoinColumn({ name: 'templateId' })
  template!: SiteTemplateEntity;

  @OneToMany(() => SiteSectionEntity, (section) => section.page)
  sections!: SiteSectionEntity[];
}
