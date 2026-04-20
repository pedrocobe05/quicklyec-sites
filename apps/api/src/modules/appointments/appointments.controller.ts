import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentsService } from './appointments.service';
import { getStaffScopeIdOrThrow, type RequestWithTenantMembership } from '../auth/tenant-staff-scope.util';

@ApiTags('Appointments')
@TenantModuleAccess('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Get()
  listAdmin(@Query('tenantId') tenantId: string, @Req() req: RequestWithTenantMembership) {
    const scope = getStaffScopeIdOrThrow(req);
    return this.appointmentsService.listByTenant(tenantId, scope);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Post()
  @Idempotent()
  createAdmin(
    @Query('tenantId') tenantId: string,
    @Body() input: CreateAppointmentDto,
    @Req() req: RequestWithTenantMembership,
  ) {
    const scope = getStaffScopeIdOrThrow(req);
    return this.appointmentsService.createAdminAppointment(tenantId, input, scope);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Patch(':appointmentId/status')
  @Idempotent()
  updateStatus(
    @Param('appointmentId') appointmentId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateAppointmentStatusDto,
    @Req() req: RequestWithTenantMembership,
  ) {
    const scope = getStaffScopeIdOrThrow(req);
    return this.appointmentsService.updateStatus(appointmentId, tenantId, input.status, scope);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Post(':appointmentId/reverse-payphone')
  @Idempotent()
  reversePayphone(
    @Param('appointmentId') appointmentId: string,
    @Query('tenantId') tenantId: string,
    @Req() req: RequestWithTenantMembership,
  ) {
    const scope = getStaffScopeIdOrThrow(req);
    return this.appointmentsService.reversePayphonePayment(appointmentId, tenantId, scope);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Patch(':appointmentId')
  @Idempotent()
  updateAppointment(
    @Param('appointmentId') appointmentId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateAppointmentDto,
    @Req() req: RequestWithTenantMembership,
  ) {
    const scope = getStaffScopeIdOrThrow(req);
    return this.appointmentsService.updateAppointment(appointmentId, tenantId, input, scope);
  }

  @Get('availability')
  getAvailability(
    @Query('tenantId') tenantId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.appointmentsService.getAvailability({
      tenantId,
      serviceId,
      date,
      staffId,
    });
  }

  @Post('public')
  @Idempotent()
  createPublicAppointment(
    @Query('tenantId') tenantId: string,
    @Body() input: CreatePublicAppointmentDto,
  ) {
    return this.appointmentsService.createPublicAppointment(tenantId, input);
  }
}
