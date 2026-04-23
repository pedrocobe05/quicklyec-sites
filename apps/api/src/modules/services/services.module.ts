import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity, ServiceEntity, StaffServiceEntity } from 'src/common/entities';
import { FilesModule } from 'src/modules/files/files.module';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity, StaffServiceEntity, AppointmentEntity]), FilesModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
