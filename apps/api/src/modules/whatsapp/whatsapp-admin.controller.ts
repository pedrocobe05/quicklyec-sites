import { Body, Controller, ForbiddenException, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from 'src/modules/auth/platform-admin.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { WhatsappAppointmentReminderService } from './whatsapp-appointment-reminder.service';
import { WhatsappTestReminderDto } from './dto/whatsapp-test-reminder.dto';
import { WhatsappTestTemplateDto } from './dto/whatsapp-test-template.dto';
import { WhatsappCloudService } from './whatsapp-cloud.service';

@ApiTags('Admin WhatsApp')
@Controller('admin/whatsapp')
export class WhatsappAdminController {
  constructor(
    private readonly whatsappCloud: WhatsappCloudService,
    private readonly whatsappAppointmentReminderService: WhatsappAppointmentReminderService,
  ) {}

  @Post('test-template')
  @ApiQuery({ name: 'tenantId', required: false, description: 'Obligatorio si el usuario no es administrador de plataforma (permiso settings).' })
  @ApiOperation({
    summary: 'Envío de prueba (plantilla)',
    description:
      'Llama a Graph API con una plantilla aprobada. El destinatario debe estar en la lista de prueba de la app (modo desarrollo) o haber optado por recibir mensajes.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('settings')
  async testTemplate(@Body() input: WhatsappTestTemplateDto) {
    const languageCode = (input.languageCode ?? 'en_US').trim();
    return this.whatsappCloud.sendTemplateMessage({
      to: input.to,
      templateName: input.templateName.trim(),
      languageCode,
      bodyParams: input.bodyParams,
    });
  }

  @Post('test-reminder')
  @ApiQuery({ name: 'tenantId', required: true, description: 'Tenant al que se cargará el consumo y registro.' })
  @ApiOperation({
    summary: 'Envío de prueba del template recordatorio_cita',
    description:
      'Disponible solo para super_admin. Usa mocks, registra el envío en el tenant y consume cuota mensual igual que un recordatorio real.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard, PlatformAdminGuard)
  @TenantModuleAccess('settings')
  async testReminder(
    @Req() req: { user?: { platformRole?: string } },
    @Query('tenantId') tenantId: string,
    @Body() input: WhatsappTestReminderDto,
  ) {
    if (req.user?.platformRole !== 'super_admin') {
      throw new ForbiddenException('Solo super_admin puede enviar pruebas de WhatsApp.');
    }
    return this.whatsappAppointmentReminderService.sendTestReminderTemplate(tenantId, input.to);
  }
}
