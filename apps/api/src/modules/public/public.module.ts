import { Module } from '@nestjs/common';
import { AppointmentsModule } from 'src/modules/appointments/appointments.module';
import { ServicesModule } from 'src/modules/services/services.module';
import { SiteModule } from 'src/modules/site/site.module';
import { PaymentsModule } from 'src/modules/payments/payments.module';
import { TenantsModule } from 'src/modules/tenants/tenants.module';
import { PublicController } from './public.controller';

@Module({
  imports: [SiteModule, TenantsModule, ServicesModule, AppointmentsModule, PaymentsModule],
  controllers: [PublicController],
})
export class PublicModule {}
