import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminUserEntity,
  PlatformRoleEntity,
  PlatformSettingEntity,
  SitePageEntity,
  SiteTemplateEntity,
  SiteSectionEntity,
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

@Module({
  imports: [
    MailModule,
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
    ]),
  ],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
