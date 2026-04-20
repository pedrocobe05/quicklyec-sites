import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';
import { getStaffScopeIdOrThrow, type RequestWithTenantMembership } from '../auth/tenant-staff-scope.util';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantMembershipGuard)
@TenantModuleAccess('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@Query('tenantId') tenantId: string) {
    return this.customersService.listByTenant(tenantId);
  }

  @Get(':customerId')
  findOne(@Param('customerId') customerId: string, @Query('tenantId') tenantId: string) {
    return this.customersService.findOne(customerId, tenantId);
  }

  @Patch(':customerId')
  update(
    @Param('customerId') customerId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateCustomerDto,
  ) {
    return this.customersService.update(customerId, tenantId, input);
  }

  @Delete(':customerId')
  remove(
    @Param('customerId') customerId: string,
    @Query('tenantId') tenantId: string,
    @Req() req: RequestWithTenantMembership,
  ) {
    const scope = getStaffScopeIdOrThrow(req);
    return this.customersService.remove(customerId, tenantId, scope);
  }
}
