import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';
import {
  assertNotTenantOperationalStaff,
  getStaffScopeIdOrThrow,
  type RequestWithTenantMembership,
} from '../auth/tenant-staff-scope.util';

@ApiTags('Staff')
@TenantModuleAccess('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Get()
  listAdmin(@Query('tenantId') tenantId: string, @Req() req: RequestWithTenantMembership) {
    const scope = getStaffScopeIdOrThrow(req);
    return this.staffService.findAdminByTenant(tenantId, scope);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Post()
  @Idempotent()
  create(@Body() input: CreateStaffDto, @Req() req: RequestWithTenantMembership) {
    assertNotTenantOperationalStaff(req, 'Solo el administrador de la empresa puede gestionar el equipo.');
    return this.staffService.create(input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Patch(':staffId')
  @Idempotent()
  update(
    @Param('staffId') staffId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateStaffDto,
    @Req() req: RequestWithTenantMembership,
  ) {
    assertNotTenantOperationalStaff(req, 'Solo el administrador de la empresa puede gestionar el equipo.');
    return this.staffService.update(staffId, tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Delete(':staffId')
  @Idempotent()
  remove(@Param('staffId') staffId: string, @Query('tenantId') tenantId: string, @Req() req: RequestWithTenantMembership) {
    assertNotTenantOperationalStaff(req, 'Solo el administrador de la empresa puede gestionar el equipo.');
    return this.staffService.remove(staffId, tenantId);
  }
}
