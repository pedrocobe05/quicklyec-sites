import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TenantBrandingEntity } from './tenant-branding.entity';
import { TenantDomainEntity } from './tenant-domain.entity';
import { TenantSettingEntity } from './tenant-setting.entity';
import { SitePageEntity } from './site-page.entity';
import { SiteSectionEntity } from './site-section.entity';
import { ServiceEntity } from './service.entity';
import { StaffEntity } from './staff.entity';
import { AvailabilityRuleEntity } from './availability-rule.entity';
import { ScheduleBlockEntity } from './schedule-block.entity';
import { CustomerEntity } from './customer.entity';
import { AppointmentEntity } from './appointment.entity';
import { TenantMembershipEntity } from './tenant-membership.entity';
import { TenantRoleEntity } from './tenant-role.entity';

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ length: 120, unique: true })
  slug!: string;

  @Column({ length: 24, default: 'active' })
  status!: string;

  @Column({ length: 24, default: 'starter' })
  plan!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => TenantDomainEntity, (domain) => domain.tenant)
  domains!: TenantDomainEntity[];

  @OneToMany(() => TenantSettingEntity, (setting) => setting.tenant)
  settings!: TenantSettingEntity[];

  @OneToMany(() => TenantBrandingEntity, (branding) => branding.tenant)
  branding!: TenantBrandingEntity[];

  @OneToMany(() => SitePageEntity, (page) => page.tenant)
  pages!: SitePageEntity[];

  @OneToMany(() => SiteSectionEntity, (section) => section.tenant)
  sections!: SiteSectionEntity[];

  @OneToMany(() => ServiceEntity, (service) => service.tenant)
  services!: ServiceEntity[];

  @OneToMany(() => StaffEntity, (staff) => staff.tenant)
  staff!: StaffEntity[];

  @OneToMany(() => AvailabilityRuleEntity, (availabilityRule) => availabilityRule.tenant)
  availabilityRules!: AvailabilityRuleEntity[];

  @OneToMany(() => ScheduleBlockEntity, (scheduleBlock) => scheduleBlock.tenant)
  scheduleBlocks!: ScheduleBlockEntity[];

  @OneToMany(() => CustomerEntity, (customer) => customer.tenant)
  customers!: CustomerEntity[];

  @OneToMany(() => AppointmentEntity, (appointment) => appointment.tenant)
  appointments!: AppointmentEntity[];

  @OneToMany(() => TenantMembershipEntity, (membership) => membership.tenant)
  memberships!: TenantMembershipEntity[];

  @OneToMany(() => TenantRoleEntity, (role) => role.tenant)
  roles!: TenantRoleEntity[];
}
