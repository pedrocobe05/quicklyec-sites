import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('Staff')
@TenantModuleAccess('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Get()
  listAdmin(@Query('tenantId') tenantId: string) {
    return this.staffService.findAdminByTenant(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Post()
  create(@Body() input: CreateStaffDto) {
    return this.staffService.create(input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Patch(':staffId')
  update(
    @Param('staffId') staffId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateStaffDto,
  ) {
    return this.staffService.update(staffId, tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Delete(':staffId')
  remove(@Param('staffId') staffId: string, @Query('tenantId') tenantId: string) {
    return this.staffService.remove(staffId, tenantId);
  }
}
