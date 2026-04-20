import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { AgendaService } from './agenda.service';
import { getStaffScopeIdOrThrow, type RequestWithTenantMembership } from '../auth/tenant-staff-scope.util';
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
  listAvailabilityRules(@Query('tenantId') tenantId: string, @Req() req: RequestWithTenantMembership) {
    return this.agendaService.listAvailabilityRules(tenantId, getStaffScopeIdOrThrow(req));
  }

  @Post('availability-rules')
  @Idempotent()
  createAvailabilityRule(@Body() input: CreateAvailabilityRuleDto, @Req() req: RequestWithTenantMembership) {
    return this.agendaService.createAvailabilityRule(input, getStaffScopeIdOrThrow(req));
  }

  @Patch('availability-rules/:ruleId')
  @Idempotent()
  updateAvailabilityRule(
    @Param('ruleId') ruleId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateAvailabilityRuleDto,
    @Req() req: RequestWithTenantMembership,
  ) {
    return this.agendaService.updateAvailabilityRule(ruleId, tenantId, input, getStaffScopeIdOrThrow(req));
  }

  @Delete('availability-rules/:ruleId')
  @Idempotent()
  removeAvailabilityRule(
    @Param('ruleId') ruleId: string,
    @Query('tenantId') tenantId: string,
    @Req() req: RequestWithTenantMembership,
  ) {
    return this.agendaService.removeAvailabilityRule(ruleId, tenantId, getStaffScopeIdOrThrow(req));
  }

  @Get('schedule-blocks')
  listScheduleBlocks(@Query('tenantId') tenantId: string, @Req() req: RequestWithTenantMembership) {
    return this.agendaService.listScheduleBlocks(tenantId, getStaffScopeIdOrThrow(req));
  }

  @Post('schedule-blocks')
  @Idempotent()
  createScheduleBlock(@Body() input: CreateScheduleBlockDto, @Req() req: RequestWithTenantMembership) {
    return this.agendaService.createScheduleBlock(input, getStaffScopeIdOrThrow(req));
  }

  @Patch('schedule-blocks/:blockId')
  @Idempotent()
  updateScheduleBlock(
    @Param('blockId') blockId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateScheduleBlockDto,
    @Req() req: RequestWithTenantMembership,
  ) {
    return this.agendaService.updateScheduleBlock(blockId, tenantId, input, getStaffScopeIdOrThrow(req));
  }

  @Delete('schedule-blocks/:blockId')
  @Idempotent()
  removeScheduleBlock(
    @Param('blockId') blockId: string,
    @Query('tenantId') tenantId: string,
    @Req() req: RequestWithTenantMembership,
  ) {
    return this.agendaService.removeScheduleBlock(blockId, tenantId, getStaffScopeIdOrThrow(req));
  }
}
