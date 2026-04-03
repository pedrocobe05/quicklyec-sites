import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity('file_objects')
export class FileObjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  storageKey!: string;

  @Column({ type: 'varchar', length: 160 })
  filename!: string;

  @Column({ type: 'varchar', length: 120 })
  contentType!: string;

  @Column({ type: 'integer', default: 0 })
  sizeBytes!: number;

  @Column({ type: 'varchar', length: 80, default: 's3' })
  provider!: string;

  @Column({ type: 'varchar', length: 80, default: 'private' })
  visibility!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: TenantEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
