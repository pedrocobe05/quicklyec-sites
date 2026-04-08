import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  AvailabilityRuleEntity,
  ScheduleBlockEntity,
  ServiceEntity,
  StaffEntity,
  StaffServiceEntity,
} from 'src/common/entities';
import { FilesModule } from 'src/modules/files/files.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffEntity,
      StaffServiceEntity,
      ServiceEntity,
      AppointmentEntity,
      AvailabilityRuleEntity,
      ScheduleBlockEntity,
    ]),
    FilesModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
