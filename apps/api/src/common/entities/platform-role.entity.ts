import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('platform_roles')
export class PlatformRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 60, unique: true })
  code!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ default: true })
  isSystem!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  permissions!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
