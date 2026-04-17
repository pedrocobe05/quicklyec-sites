import { Body, Controller, Headers, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { TenantsService } from 'src/modules/tenants/tenants.service';
import { PreparePayphonePaymentDto } from './dto/prepare-payphone-payment.dto';
import { ConfirmPayphonePaymentDto } from './dto/confirm-payphone-payment.dto';
import { ApplyPayphoneClientConfirmDto } from './dto/apply-payphone-client-confirm.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('public/payphone')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Post('prepare')
  @Idempotent()
  async prepare(@Headers('host') headerHost: string, @Query('host') queryHost: string | undefined, @Body() input: PreparePayphonePaymentDto) {
    const resolved = await this.tenantsService.resolveTenantByHost(queryHost ?? headerHost);
    return this.paymentsService.preparePayphonePayment(resolved.tenant.id, input);
  }

  @Post('confirm')
  @Idempotent()
  async confirm(@Headers('host') headerHost: string, @Query('host') queryHost: string | undefined, @Body() input: ConfirmPayphonePaymentDto) {
    const resolved = await this.tenantsService.resolveTenantByHost(queryHost ?? headerHost);
    return this.paymentsService.confirmPayphonePayment(resolved.tenant.id, input);
  }

  /** Resultado de `V2/Confirm` ejecutado en el navegador; persiste reserva sin llamar a Payphone desde el API. */
  @Post('apply-confirm')
  @Idempotent()
  async applyClientConfirm(
    @Headers('host') headerHost: string,
    @Query('host') queryHost: string | undefined,
    @Body() input: ApplyPayphoneClientConfirmDto,
  ) {
    const resolved = await this.tenantsService.resolveTenantByHost(queryHost ?? headerHost);
    return this.paymentsService.applyPayphoneClientConfirm(resolved.tenant.id, input);
  }
}
