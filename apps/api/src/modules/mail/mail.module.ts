import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformSettingEntity, TenantBrandingEntity, TenantEntity, TenantSettingEntity } from 'src/common/entities';
import { MailService } from './mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantSettingEntity, TenantBrandingEntity, TenantEntity, PlatformSettingEntity]),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
