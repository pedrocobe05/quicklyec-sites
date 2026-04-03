import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('platform_settings')
export class PlatformSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 160, default: 'Quickly Sites' })
  platformName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supportEmail!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  supportPhone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publicAppUrl!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  quicklysitesBaseDomain!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  defaultSenderName!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  defaultSenderEmail!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
