import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'path';
import { appConfig, databaseConfig } from './common/config';
import { typeOrmOptions } from './common/database/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { PublicModule } from './modules/public/public.module';
import { ServicesModule } from './modules/services/services.module';
import { SiteModule } from './modules/site/site.module';
import { StaffModule } from './modules/staff/staff.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PlatformModule } from './modules/platform/platform.module';
import { MailModule } from './modules/mail/mail.module';
import { FilesModule } from './modules/files/files.module';
import { IdempotencyModule } from './core/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './core/interceptors/idempotency.interceptor';
import { RequestLoggingInterceptor } from './core/interceptors/request-logging.interceptor';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), 'apps/api/.env'),
        resolve(__dirname, '../.env'),
        resolve(__dirname, '../../apps/api/.env'),
      ],
      load: [appConfig, databaseConfig],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 30,
      },
    ]),
    TypeOrmModule.forRootAsync(typeOrmOptions),
    HealthModule,
    AuthModule,
    TenantsModule,
    SiteModule,
    ServicesModule,
    StaffModule,
    AppointmentsModule,
    AgendaModule,
    CustomersModule,
    PlatformModule,
    MailModule,
    FilesModule,
    PublicModule,
    IdempotencyModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
