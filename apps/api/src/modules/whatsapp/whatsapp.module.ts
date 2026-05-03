import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity, TenantSettingEntity, WhatsappOutboundLogEntity } from 'src/common/entities';
import { MailModule } from 'src/modules/mail/mail.module';
import { WhatsappAdminController } from './whatsapp-admin.controller';
import { WhatsappAppointmentReminderService } from './whatsapp-appointment-reminder.service';
import { WhatsappCloudService } from './whatsapp-cloud.service';
import { WhatsappInboundService } from './whatsapp-inbound.service';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';

@Module({
  imports: [MailModule, TypeOrmModule.forFeature([WhatsappOutboundLogEntity, TenantEntity, TenantSettingEntity])],
  controllers: [WhatsappWebhookController, WhatsappAdminController],
  providers: [WhatsappCloudService, WhatsappAppointmentReminderService, WhatsappInboundService],
  exports: [WhatsappCloudService, WhatsappAppointmentReminderService, WhatsappInboundService],
})
export class WhatsappModule {}
