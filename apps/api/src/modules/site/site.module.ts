import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SitePageEntity, SiteSectionEntity, SiteTemplateEntity, TenantEntity } from 'src/common/entities';
import { FilesModule } from 'src/modules/files/files.module';
import { ServicesModule } from 'src/modules/services/services.module';
import { StaffModule } from 'src/modules/staff/staff.module';
import { TenantsModule } from 'src/modules/tenants/tenants.module';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SitePageEntity, SiteSectionEntity, SiteTemplateEntity, TenantEntity]),
    FilesModule,
    TenantsModule,
    ServicesModule,
    StaffModule,
  ],
  controllers: [SiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
