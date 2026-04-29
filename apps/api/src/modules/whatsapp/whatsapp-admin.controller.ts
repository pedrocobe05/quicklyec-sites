import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { WhatsappTestTemplateDto } from './dto/whatsapp-test-template.dto';
import { WhatsappCloudService } from './whatsapp-cloud.service';

@ApiTags('Admin WhatsApp')
@Controller('admin/whatsapp')
export class WhatsappAdminController {
  constructor(private readonly whatsappCloud: WhatsappCloudService) {}

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
}
