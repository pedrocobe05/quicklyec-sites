import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminUserEntity,
  TenantBrandingEntity,
  TenantDomainEntity,
  TenantEntity,
  TenantMembershipEntity,
  TenantRoleEntity,
  TenantSettingEntity,
  SubscriptionPlanEntity,
} from 'src/common/entities';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { MailModule } from '../mail/mail.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    MailModule,
    FilesModule,
    TypeOrmModule.forFeature([
      TenantEntity,
      TenantDomainEntity,
      TenantSettingEntity,
      TenantBrandingEntity,
      TenantMembershipEntity,
      TenantRoleEntity,
      AdminUserEntity,
      SubscriptionPlanEntity,
    ]),
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
