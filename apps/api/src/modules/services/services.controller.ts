import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';
import { assertNotTenantOperationalStaff, type RequestWithTenantMembership } from '../auth/tenant-staff-scope.util';

@ApiTags('Services')
@TenantModuleAccess('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Get()
  listAdmin(@Query('tenantId') tenantId: string) {
    return this.servicesService.findAdminByTenant(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Post()
  @Idempotent()
  create(@Body() input: CreateServiceDto, @Req() req: RequestWithTenantMembership) {
    assertNotTenantOperationalStaff(req, 'Solo el administrador de la empresa puede gestionar el catálogo de servicios.');
    return this.servicesService.create(input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Patch(':serviceId')
  @Idempotent()
  update(
    @Param('serviceId') serviceId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateServiceDto,
    @Req() req: RequestWithTenantMembership,
  ) {
    assertNotTenantOperationalStaff(req, 'Solo el administrador de la empresa puede gestionar el catálogo de servicios.');
    return this.servicesService.update(serviceId, tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Delete(':serviceId')
  @Idempotent()
  remove(@Param('serviceId') serviceId: string, @Query('tenantId') tenantId: string, @Req() req: RequestWithTenantMembership) {
    assertNotTenantOperationalStaff(req, 'Solo el administrador de la empresa puede gestionar el catálogo de servicios.');
    return this.servicesService.remove(serviceId, tenantId);
  }
}
