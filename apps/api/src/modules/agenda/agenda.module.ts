import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityRuleEntity, ScheduleBlockEntity, TenantMembershipEntity } from 'src/common/entities';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

@Module({
  imports: [TypeOrmModule.forFeature([AvailabilityRuleEntity, ScheduleBlockEntity, TenantMembershipEntity])],
  controllers: [AgendaController],
  providers: [AgendaService],
  exports: [AgendaService],
})
export class AgendaModule {}
