import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminUserEntity,
  AppointmentEntity,
  CustomerEntity,
  PlatformRoleEntity,
  PlatformSettingEntity,
  ServiceEntity,
  SitePageEntity,
  SiteTemplateEntity,
  SiteSectionEntity,
  StaffEntity,
  SubscriptionPlanEntity,
  TenantBrandingEntity,
  TenantDomainEntity,
  TenantEntity,
  TenantMembershipEntity,
  TenantRoleEntity,
  TenantSettingEntity,
} from 'src/common/entities';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { MailModule } from '../mail/mail.module';
import { TenantsModule } from '../tenants/tenants.module';
import { TenantSubscriptionMonitorService } from './tenant-subscription-monitor.service';

@Module({
  imports: [
    MailModule,
    TenantsModule,
    TypeOrmModule.forFeature([
      SubscriptionPlanEntity,
      PlatformRoleEntity,
      PlatformSettingEntity,
      SitePageEntity,
      SiteTemplateEntity,
      SiteSectionEntity,
      TenantEntity,
      TenantDomainEntity,
      TenantSettingEntity,
      TenantBrandingEntity,
      TenantMembershipEntity,
      TenantRoleEntity,
      AdminUserEntity,
      AppointmentEntity,
      CustomerEntity,
      ServiceEntity,
      StaffEntity,
    ]),
  ],
  controllers: [PlatformController],
  providers: [PlatformService, TenantSubscriptionMonitorService],
})
export class PlatformModule {}
