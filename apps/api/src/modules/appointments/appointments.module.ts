import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  AvailabilityRuleEntity,
  CustomerEntity,
  ScheduleBlockEntity,
} from 'src/common/entities';
import { MailModule } from 'src/modules/mail/mail.module';
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
    ]),
    ServicesModule,
    MailModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentRemindersService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
