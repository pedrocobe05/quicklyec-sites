import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AppointmentEntity, TenantEntity, TenantSettingEntity, WhatsappOutboundLogEntity } from 'src/common/entities';
import { MailService } from 'src/modules/mail/mail.service';
import { getPlanMetadata, normalizePlanCode } from 'src/modules/tenants/tenant-access.constants';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { WhatsappCloudService } from './whatsapp-cloud.service';

export const APPOINTMENT_REMINDER_CHANNEL = 'appointment_reminder';
export const APPOINTMENT_REMINDER_TEST_CHANNEL = 'appointment_reminder_test';

function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function normalizeCustomerPhoneDigits(raw: string | null | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  return digits;
}

function buildRenderedPreview(locale: 'es' | 'en', params: readonly string[]): string {
  const [p1, p2, p3, p4, p5, p6, p7] = params;
  if (locale === 'en') {
    return [
      `Hello ${p1},`,
      '',
      'This is a reminder for your upcoming appointment.',
      '',
      `Service: ${p2}`,
      `Professional: ${p3}`,
      `Date: ${p4}`,
      `Status: ${p5}`,
      `Phone: ${p6}`,
      `Address: ${p7}`,
      '',
      'If you need to reschedule or have questions, contact us directly.',
    ].join('\n');
  }
  return [
    `Hola ${p1},`,
    '',
    'Te recordamos tu próxima cita.',
    '',
    `Servicio: ${p2}`,
    `Profesional: ${p3}`,
    `Fecha: ${p4}`,
    `Estado: ${p5}`,
    `Teléfono: ${p6}`,
    `Dirección: ${p7}`,
    '',
    'Si necesitas reprogramarla o tienes dudas, contáctanos directamente.',
  ].join('\n');
}

@Injectable()
export class WhatsappAppointmentReminderService {
  private readonly logger = new Logger(WhatsappAppointmentReminderService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly whatsappCloud: WhatsappCloudService,
    @InjectRepository(WhatsappOutboundLogEntity)
    private readonly logsRepository: Repository<WhatsappOutboundLogEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
    @InjectRepository(TenantSettingEntity)
    private readonly settingsRepository: Repository<TenantSettingEntity>,
  ) {}

  async trySendAppointmentReminder(params: {
    appointment: AppointmentEntity;
    settings: TenantSettingEntity | null;
  }): Promise<{ outcome: 'sent' | 'skipped' | 'failed'; detail?: string }> {
    const { appointment, settings } = params;

    if (!settings?.whatsappReminderEnabled) {
      return { outcome: 'skipped', detail: 'whatsapp_disabled' };
    }

    const planMetadata = getPlanMetadata(normalizePlanCode(appointment.tenant?.plan));
    if (!planMetadata.features.includes('appointment_reminders')) {
      return { outcome: 'skipped', detail: 'plan_sin_recordatorios' };
    }

    const quota = settings.whatsappReminderMonthlyQuota ?? 100;
    const sentThisMonth = await this.countSentMessagesThisMonth(appointment.tenantId);

    if (sentThisMonth >= quota) {
      return { outcome: 'skipped', detail: 'cuota_whatsapp_agotada' };
    }

    const toDigits = normalizeCustomerPhoneDigits(appointment.customer?.phone);
    if (!toDigits) {
      return { outcome: 'skipped', detail: 'cliente_sin_telefono_valido' };
    }

    const formatting = await this.mailService.resolveAppointmentReminderFormatting({
      tenantId: appointment.tenantId,
      startDateTime: appointment.startDateTime,
    });

    const locale = formatting.locale;
    const staffFallback = locale === 'en' ? 'Not assigned' : 'No indicado';
    const dash = locale === 'en' ? '—' : '—';

    const bodyParams = [
      (appointment.customer?.fullName ?? '').trim() || (locale === 'en' ? 'Customer' : 'Cliente'),
      appointment.service?.name ?? (locale === 'en' ? 'Appointment' : 'Cita'),
      appointment.staff?.name?.trim() ? appointment.staff.name : staffFallback,
      formatting.dateTime,
      formatting.statusLabel,
      settings.contactPhone?.trim() ? settings.contactPhone.trim() : dash,
      settings.contactAddress?.trim() ? settings.contactAddress.trim() : dash,
    ];

    const templateName =
      locale === 'en'
        ? this.configService.get<string>('app.whatsappReminderTemplateNameEn', 'recordatorio_cita_en')
        : this.configService.get<string>('app.whatsappReminderTemplateNameEs', 'recordatorio_cita');

    const languageCode =
      locale === 'en'
        ? this.configService.get<string>('app.whatsappReminderLanguageCodeEn', 'en_US')
        : this.configService.get<string>('app.whatsappReminderLanguageCodeEs', 'es_EC');

    const renderedPreview = buildRenderedPreview(locale, bodyParams);

    try {
      const result = await this.whatsappCloud.sendTemplateMessage({
        to: toDigits,
        templateName,
        languageCode,
        bodyParams,
      });

      await this.logsRepository.save(
        this.logsRepository.create({
          tenantId: appointment.tenantId,
          appointmentId: appointment.id,
          channel: APPOINTMENT_REMINDER_CHANNEL,
          toPhone: toDigits,
          templateName,
          languageCode,
          bodyParams,
          renderedPreview,
          graphMessageId: result.messageId,
          status: 'sent',
          errorMessage: null,
        }),
      );

      return { outcome: 'sent' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';

      await this.logsRepository.save(
        this.logsRepository.create({
          tenantId: appointment.tenantId,
          appointmentId: appointment.id,
          channel: APPOINTMENT_REMINDER_CHANNEL,
          toPhone: toDigits,
          templateName,
          languageCode,
          bodyParams,
          renderedPreview,
          graphMessageId: null,
          status: 'failed',
          errorMessage: message,
        }),
      );

      this.logger.warn(`WhatsApp recordatorio falló para cita ${appointment.id}: ${message}`);
      return { outcome: 'failed', detail: message };
    }
  }

  async sendTestReminderTemplate(tenantId: string, to: string): Promise<{ messageId: string; channel: string }> {
    const [tenant, settings] = await Promise.all([
      this.tenantsRepository.findOne({ where: { id: tenantId } }),
      this.settingsRepository.findOne({ where: { tenantId } }),
    ]);

    if (!tenant) {
      throw new Error('Tenant no encontrado');
    }

    const planMetadata = getPlanMetadata(normalizePlanCode(tenant.plan));
    if (!planMetadata.features.includes('appointment_reminders')) {
      throw new Error('El plan del tenant no incluye recordatorios por WhatsApp.');
    }

    const quota = settings?.whatsappReminderMonthlyQuota ?? 100;
    const sentThisMonth = await this.countSentMessagesThisMonth(tenantId);
    if (sentThisMonth >= quota) {
      throw new Error('La cuota mensual de WhatsApp de este tenant ya fue agotada.');
    }

    const normalizedTo = this.whatsappCloud.normalizeToDigits(to);
    const now = new Date();
    const locale = String(settings?.locale ?? 'es-EC').toLowerCase().startsWith('en') ? 'en' : 'es';
    const dateTime = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: settings?.timezone ?? 'America/Guayaquil',
    }).format(now);
    const dash = '—';
    const bodyParams = [
      locale === 'en' ? 'Test customer' : 'Cliente de prueba',
      locale === 'en' ? 'Demo service' : 'Servicio demo',
      locale === 'en' ? 'Demo professional' : 'Profesional demo',
      dateTime,
      locale === 'en' ? 'Confirmed' : 'Confirmada',
      settings?.contactPhone?.trim() ? settings.contactPhone.trim() : dash,
      settings?.contactAddress?.trim() ? settings.contactAddress.trim() : dash,
    ];

    const templateName =
      locale === 'en'
        ? this.configService.get<string>('app.whatsappReminderTemplateNameEn', 'recordatorio_cita_en')
        : this.configService.get<string>('app.whatsappReminderTemplateNameEs', 'recordatorio_cita');

    const languageCode =
      locale === 'en'
        ? this.configService.get<string>('app.whatsappReminderLanguageCodeEn', 'en_US')
        : this.configService.get<string>('app.whatsappReminderLanguageCodeEs', 'es_EC');

    const renderedPreview = buildRenderedPreview(locale, bodyParams);

    try {
      const result = await this.whatsappCloud.sendTemplateMessage({
        to: normalizedTo,
        templateName,
        languageCode,
        bodyParams,
      });

      await this.logsRepository.save(
        this.logsRepository.create({
          tenantId,
          appointmentId: null,
          channel: APPOINTMENT_REMINDER_TEST_CHANNEL,
          toPhone: normalizedTo,
          templateName,
          languageCode,
          bodyParams,
          renderedPreview,
          graphMessageId: result.messageId,
          status: 'sent',
          errorMessage: null,
        }),
      );

      return { messageId: result.messageId, channel: APPOINTMENT_REMINDER_TEST_CHANNEL };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';

      await this.logsRepository.save(
        this.logsRepository.create({
          tenantId,
          appointmentId: null,
          channel: APPOINTMENT_REMINDER_TEST_CHANNEL,
          toPhone: normalizedTo,
          templateName,
          languageCode,
          bodyParams,
          renderedPreview,
          graphMessageId: null,
          status: 'failed',
          errorMessage: message,
        }),
      );

      throw error;
    }
  }

  async countSentMessagesThisMonth(tenantId: string): Promise<number> {
    return this.logsRepository.count({
      where: {
        tenantId,
        status: 'sent',
        createdAt: MoreThanOrEqual(startOfMonthUtc()),
      },
    });
  }
}
