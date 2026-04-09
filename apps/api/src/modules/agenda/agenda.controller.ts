import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { AgendaService } from './agenda.service';
import { CreateAvailabilityRuleDto } from './dto/create-availability-rule.dto';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateAvailabilityRuleDto } from './dto/update-availability-rule.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';

@ApiTags('Agenda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantMembershipGuard)
@TenantModuleAccess('agenda')
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get('availability-rules')
  listAvailabilityRules(@Query('tenantId') tenantId: string) {
    return this.agendaService.listAvailabilityRules(tenantId);
  }

  @Post('availability-rules')
  @Idempotent()
  createAvailabilityRule(@Body() input: CreateAvailabilityRuleDto) {
    return this.agendaService.createAvailabilityRule(input);
  }

  @Patch('availability-rules/:ruleId')
  @Idempotent()
  updateAvailabilityRule(
    @Param('ruleId') ruleId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateAvailabilityRuleDto,
  ) {
    return this.agendaService.updateAvailabilityRule(ruleId, tenantId, input);
  }

  @Delete('availability-rules/:ruleId')
  @Idempotent()
  removeAvailabilityRule(@Param('ruleId') ruleId: string, @Query('tenantId') tenantId: string) {
    return this.agendaService.removeAvailabilityRule(ruleId, tenantId);
  }

  @Get('schedule-blocks')
  listScheduleBlocks(@Query('tenantId') tenantId: string) {
    return this.agendaService.listScheduleBlocks(tenantId);
  }

  @Post('schedule-blocks')
  @Idempotent()
  createScheduleBlock(@Body() input: CreateScheduleBlockDto) {
    return this.agendaService.createScheduleBlock(input);
  }

  @Patch('schedule-blocks/:blockId')
  @Idempotent()
  updateScheduleBlock(
    @Param('blockId') blockId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateScheduleBlockDto,
  ) {
    return this.agendaService.updateScheduleBlock(blockId, tenantId, input);
  }

  @Delete('schedule-blocks/:blockId')
  @Idempotent()
  removeScheduleBlock(@Param('blockId') blockId: string, @Query('tenantId') tenantId: string) {
    return this.agendaService.removeScheduleBlock(blockId, tenantId);
  }
}
