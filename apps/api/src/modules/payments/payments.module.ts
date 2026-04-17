import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity, PayphoneTransactionEntity } from 'src/common/entities';
import { AppointmentsModule } from 'src/modules/appointments/appointments.module';
import { ServicesModule } from 'src/modules/services/services.module';
import { TenantsModule } from 'src/modules/tenants/tenants.module';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayphoneTransactionEntity, AppointmentEntity]),
    TenantsModule,
    ServicesModule,
    AppointmentsModule,
  ],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
