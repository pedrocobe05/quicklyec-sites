import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import {
  AdminUserEntity,
  AppointmentEntity,
  AvailabilityRuleEntity,
  CustomerEntity,
  FileObjectEntity,
  PlatformRoleEntity,
  PlatformSettingEntity,
  RefreshTokenEntity,
  ScheduleBlockEntity,
  ServiceEntity,
  SitePageEntity,
  SiteSectionEntity,
  SiteTemplateEntity,
  StaffEntity,
  StaffServiceEntity,
  TenantBrandingEntity,
  TenantDomainEntity,
  TenantEntity,
  TenantMembershipEntity,
  TenantRoleEntity,
  TenantSettingEntity,
  SubscriptionPlanEntity,
} from '../entities';
import { IdempotencyKeyEntity } from '../../core/idempotency/entities/idempotency-key.entity';

type BuildTypeOrmOptionsOptions = {
  includeMigrations?: boolean;
};

export function buildTypeOrmOptions(
  configService: ConfigService,
  options: BuildTypeOrmOptionsOptions = {},
): DataSourceOptions {
  const { includeMigrations = false } = options;

  return {
    type: 'postgres',
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.user'),
    password: configService.get<string>('database.password'),
    database: configService.get<string>('database.name'),
    ssl: configService.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
    entities: [
      TenantEntity,
      TenantDomainEntity,
      TenantSettingEntity,
      TenantBrandingEntity,
      SiteTemplateEntity,
      SitePageEntity,
      SiteSectionEntity,
      ServiceEntity,
      StaffEntity,
      StaffServiceEntity,
      AvailabilityRuleEntity,
      ScheduleBlockEntity,
      CustomerEntity,
      FileObjectEntity,
      AppointmentEntity,
      AdminUserEntity,
      PlatformRoleEntity,
      PlatformSettingEntity,
      TenantMembershipEntity,
      TenantRoleEntity,
      RefreshTokenEntity,
      SubscriptionPlanEntity,
      IdempotencyKeyEntity,
    ],
    migrations: includeMigrations ? ['src/database/migrations/*.ts'] : [],
    synchronize: false,
  };
}

export const typeOrmOptions: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => buildTypeOrmOptions(configService),
};
