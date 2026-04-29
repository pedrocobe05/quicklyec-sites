import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { AppointmentEntity, TenantSettingEntity } from 'src/common/entities';
import { FilesService } from 'src/modules/files/files.service';
import { MailService } from 'src/modules/mail/mail.service';
import { WhatsappAppointmentReminderService } from 'src/modules/whatsapp/whatsapp-appointment-reminder.service';
import { getPlanMetadata, normalizePlanCode } from 'src/modules/tenants/tenant-access.constants';

@Injectable()
export class AppointmentRemindersService {
  private readonly logger = new Logger(AppointmentRemindersService.name);

  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    @InjectRepository(TenantSettingEntity)
    private readonly tenantSettingsRepository: Repository<TenantSettingEntity>,
    private readonly filesService: FilesService,
    private readonly mailService: MailService,
    private readonly whatsappAppointmentReminder: WhatsappAppointmentReminderService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async dispatchDueReminders() {
    const now = new Date();
    const appointments = await this.appointmentsRepository.find({
      where: {
        reminderScheduledAt: LessThanOrEqual(now),
        reminderSentAt: IsNull(),
        status: In(['pending', 'confirmed']),
        customerId: Not(IsNull()),
      },
      relations: ['customer', 'service', 'tenant', 'staff'],
      order: { reminderScheduledAt: 'ASC' },
      take: 50,
    });

    for (const appointment of appointments) {
      try {
        const planMetadata = getPlanMetadata(normalizePlanCode(appointment.tenant?.plan));
        if (!planMetadata.features.includes('appointment_reminders')) {
          continue;
        }

        const settings = await this.tenantSettingsRepository.findOne({
          where: { tenantId: appointment.tenantId },
        });

        let emailOk = false;
        let emailError: string | null = null;

        if (appointment.customer?.email?.trim()) {
          try {
            const staffPhotoUrl = await this.filesService.resolveStoredReference(
              appointment.staff?.avatarUrl,
              appointment.tenantId,
            );
            await this.mailService.sendAppointmentReminderEmail({
              to: appointment.customer.email,
              tenantId: appointment.tenantId,
              recipientName: appointment.customer.fullName,
              serviceName: appointment.service?.name ?? 'tu cita',
              staffName: appointment.staff?.name ?? null,
              staffPhotoUrl,
              contactPhone: settings?.contactPhone ?? null,
              contactAddress: settings?.contactAddress ?? null,
              startDateTime: appointment.startDateTime,
            });
            emailOk = true;
          } catch (mailErr) {
            emailError = mailErr instanceof Error ? mailErr.message : 'Error enviando correo';
          }
        }

        let whatsappResult: { outcome: 'sent' | 'skipped' | 'failed'; detail?: string };
        try {
          whatsappResult = await this.whatsappAppointmentReminder.trySendAppointmentReminder({
            appointment,
            settings,
          });
        } catch (waErr) {
          whatsappResult = {
            outcome: 'failed',
            detail: waErr instanceof Error ? waErr.message : 'Error WhatsApp',
          };
        }

        const whatsappOk = whatsappResult.outcome === 'sent';

        if (!emailOk && !whatsappOk) {
          const reasons: string[] = [];
          if (!appointment.customer?.email?.trim()) {
            reasons.push('Cliente sin correo');
          } else if (emailError) {
            reasons.push(`Correo: ${emailError}`);
          }
          if (whatsappResult.outcome === 'failed') {
            reasons.push(`WhatsApp: ${whatsappResult.detail ?? 'error'}`);
          } else if (
            whatsappResult.outcome === 'skipped'
            && settings?.whatsappReminderEnabled
            && whatsappResult.detail
          ) {
            reasons.push(`WhatsApp: ${whatsappResult.detail}`);
          }
          appointment.reminderError =
            reasons.join('; ') || 'Sin canal de recordatorio disponible (correo o WhatsApp)';
          await this.appointmentsRepository.save(appointment);
          continue;
        }

        const warnings: string[] = [];
        if (!emailOk && appointment.customer?.email?.trim() && emailError) {
          warnings.push(`Correo: ${emailError}`);
        }
        if (!whatsappOk && whatsappResult.outcome === 'failed') {
          warnings.push(`WhatsApp: ${whatsappResult.detail ?? 'error'}`);
        }

        appointment.reminderSentAt = new Date();
        appointment.reminderError = warnings.length ? warnings.join('; ') : null;
        await this.appointmentsRepository.save(appointment);
      } catch (error) {
        appointment.reminderError = error instanceof Error ? error.message : 'Error enviando recordatorio';
        await this.appointmentsRepository.save(appointment);
        this.logger.error(
          `No se pudo enviar recordatorio de cita ${appointment.id}: ${
            error instanceof Error ? error.stack ?? error.message : 'error desconocido'
          }`,
        );
      }
    }
  }
}
