import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { PayphoneTestPrepareDto } from './dto/payphone-test-prepare.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Admin Payments')
@Controller('admin/payments')
export class PaymentsAdminController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('settings')
  @Post('payphone-test-prepare')
  @Idempotent()
  preparePayphoneTest(
    @Query('tenantId') tenantId: string,
    @Body() input: PayphoneTestPrepareDto,
  ) {
    return this.paymentsService.preparePayphoneTestPayment(tenantId, input);
  }
}
