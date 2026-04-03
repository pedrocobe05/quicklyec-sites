import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SitePageEntity } from './site-page.entity';

@Entity('site_templates')
export class SiteTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 80 })
  code!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 255 })
  description!: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => SitePageEntity, (page) => page.template)
  pages!: SitePageEntity[];
}
