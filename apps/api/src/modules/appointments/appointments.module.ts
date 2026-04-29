import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  AvailabilityRuleEntity,
  CustomerEntity,
  ScheduleBlockEntity,
  PayphoneTransactionEntity,
  StaffServiceEntity,
  TenantSettingEntity,
} from 'src/common/entities';
import { MailModule } from 'src/modules/mail/mail.module';
import { FilesModule } from 'src/modules/files/files.module';
import { WhatsappModule } from 'src/modules/whatsapp/whatsapp.module';
import { ServicesModule } from 'src/modules/services/services.module';
import { AppointmentRemindersService } from './appointment-reminders.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppointmentEntity,
      AvailabilityRuleEntity,
      ScheduleBlockEntity,
      CustomerEntity,
      PayphoneTransactionEntity,
      StaffServiceEntity,
      TenantSettingEntity,
    ]),
    ServicesModule,
    MailModule,
    FilesModule,
    WhatsappModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentRemindersService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
