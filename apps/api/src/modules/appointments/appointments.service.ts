import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  AppointmentEntity,
  AvailabilityRuleEntity,
  CustomerEntity,
  PayphoneTransactionEntity,
  ScheduleBlockEntity,
  StaffServiceEntity,
  TenantSettingEntity,
} from 'src/common/entities';
import { getPlanMetadata, normalizePlanCode } from 'src/modules/tenants/tenant-access.constants';
import { FilesService } from 'src/modules/files/files.service';
import { MailService } from 'src/modules/mail/mail.service';
import { ServicesService } from 'src/modules/services/services.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

interface AvailabilityQuery {
  tenantId: string;
  serviceId: string;
  date: string;
  staffId?: string;
}

type PaymentMethod = 'cash' | 'transfer' | 'payphone';

export interface AvailabilitySlot {
  start: string;
  end: string;
  staffId?: string | null;
  staffName?: string | null;
  available: boolean;
  unavailableReason?: string | null;
}

@Injectable()
export class AppointmentsService {
  private static readonly BLOCKING_STATUSES = ['pending', 'confirmed'] as const;
  private static readonly DEFAULT_TIMEZONE = 'America/Guayaquil';
  private static readonly WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    @InjectRepository(AvailabilityRuleEntity)
    private readonly availabilityRepository: Repository<AvailabilityRuleEntity>,
    @InjectRepository(ScheduleBlockEntity)
    private readonly scheduleBlocksRepository: Repository<ScheduleBlockEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customersRepository: Repository<CustomerEntity>,
    @InjectRepository(PayphoneTransactionEntity)
    private readonly payphoneTransactionsRepository: Repository<PayphoneTransactionEntity>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServicesRepository: Repository<StaffServiceEntity>,
    @InjectRepository(TenantSettingEntity)
    private readonly tenantSettingsRepository: Repository<TenantSettingEntity>,
    private readonly filesService: FilesService,
    private readonly mailService: MailService,
    private readonly servicesService: ServicesService,
  ) {}

  private resolveLocale(value?: string | null) {
    const normalized = String(value ?? '').toLowerCase().trim();
    return normalized.startsWith('en') ? 'en' : 'es';
  }

  private getAvailablePaymentMethods(settings?: TenantSettingEntity | null): PaymentMethod[] {
    const methods: PaymentMethod[] = [];

    if (settings?.cashPaymentEnabled ?? true) {
      methods.push('cash');
    }

    if (settings?.transferPaymentEnabled) {
      methods.push('transfer');
    }

    if (settings?.payphonePaymentEnabled) {
      methods.push('payphone');
    }

    return methods;
  }

  private resolvePaymentMethod(settings?: TenantSettingEntity | null, requested?: string | null): PaymentMethod {
    const availableMethods = this.getAvailablePaymentMethods(settings);
    if (availableMethods.length === 0) {
      throw new BadRequestException('No hay métodos de pago habilitados para este tenant');
    }

    const normalizedRequested = String(requested ?? '').toLowerCase().trim();
    if (normalizedRequested) {
      if (!availableMethods.includes(normalizedRequested as PaymentMethod)) {
        throw new BadRequestException('El método de pago seleccionado no está habilitado');
      }
      return normalizedRequested as PaymentMethod;
    }

    return availableMethods[0];
  }

  private computeReminderScheduledAt(startDateTime: Date) {
    const now = new Date();
    const msUntilAppointment = startDateTime.getTime() - now.getTime();

    if (msUntilAppointment <= 45 * 60 * 1000) {
      return null;
    }

    const hoursUntilAppointment = msUntilAppointment / (60 * 60 * 1000);
    if (hoursUntilAppointment > 26) {
      return new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);
    }

    if (hoursUntilAppointment > 3) {
      return new Date(startDateTime.getTime() - 2 * 60 * 60 * 1000);
    }

    return new Date(startDateTime.getTime() - 30 * 60 * 1000);
  }

  private normalizeTimeValue(time: string) {
    return /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : `${time}:00`;
  }

  private addOneDay(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    const nextYear = next.getUTCFullYear();
    const nextMonth = String(next.getUTCMonth() + 1).padStart(2, '0');
    const nextDay = String(next.getUTCDate()).padStart(2, '0');
    return `${nextYear}-${nextMonth}-${nextDay}`;
  }

  private getZonedParts(date: Date, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

    return {
      year: value('year'),
      month: value('month'),
      day: value('day'),
      hour: value('hour'),
      minute: value('minute'),
      second: value('second'),
      weekday: value('weekday'),
    };
  }

  private zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
    const normalizedTime = this.normalizeTimeValue(time);
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes, seconds] = normalizedTime.split(':').map(Number);
    const desiredUtcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);
    const guess = new Date(desiredUtcMs);
    const zoned = this.getZonedParts(guess, timeZone);
    const zonedUtcMs = Date.UTC(
      Number(zoned.year),
      Number(zoned.month) - 1,
      Number(zoned.day),
      Number(zoned.hour),
      Number(zoned.minute),
      Number(zoned.second),
    );
    const offsetMs = zonedUtcMs - guess.getTime();
    return new Date(desiredUtcMs - offsetMs);
  }

  private getLocalTimeString(date: Date, timeZone: string) {
    const zoned = this.getZonedParts(date, timeZone);
    return `${zoned.hour}:${zoned.minute}:${zoned.second}`;
  }

  private getLocalDayOfWeek(date: Date, timeZone: string) {
    const zoned = this.getZonedParts(date, timeZone);
    return AppointmentsService.WEEKDAY_INDEX[zoned.weekday] ?? date.getUTCDay();
  }

  private getTenantDayRange(date: string, timeZone: string) {
    const start = this.zonedDateTimeToUtc(date, '00:00:00', timeZone);
    const nextDate = this.addOneDay(date);
    const nextStart = this.zonedDateTimeToUtc(nextDate, '00:00:00', timeZone);
    return {
      dayStart: start,
      dayEnd: new Date(nextStart.getTime() - 1000),
    };
  }

  private async getTenantTimezone(tenantId: string) {
    const settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });

    return settings?.timezone ?? AppointmentsService.DEFAULT_TIMEZONE;
  }

  private isSameZonedDay(left: Date, right: Date, timeZone: string) {
    const leftParts = this.getZonedParts(left, timeZone);
    const rightParts = this.getZonedParts(right, timeZone);
    return `${leftParts.year}-${leftParts.month}-${leftParts.day}` === `${rightParts.year}-${rightParts.month}-${rightParts.day}`;
  }

  private isPayphoneReverseWindowOpen(transactionDate: Date, now: Date, timeZone: string) {
    if (!this.isSameZonedDay(transactionDate, now, timeZone)) {
      return false;
    }

    const nowParts = this.getZonedParts(now, timeZone);
    const nowMinutes =
      Number(nowParts.hour) * 60
      + Number(nowParts.minute)
      + Number(nowParts.second) / 60;

    return nowMinutes <= 20 * 60;
  }

  private parsePayphoneReverseResponse(raw: string) {
    let parsed: unknown = null;
    if (raw.trim()) {
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        parsed = raw;
      }
    }

    const parsedRecord = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
    const responseError =
      parsedRecord && typeof parsedRecord.error === 'object' && parsedRecord.error !== null
        ? parsedRecord.error as { message?: unknown }
        : null;
    const responseMessage =
      typeof parsedRecord?.message === 'string' && parsedRecord.message.trim()
        ? parsedRecord.message.trim()
        : typeof responseError?.message === 'string' && responseError.message.trim()
          ? responseError.message.trim()
          : null;

    return {
      parsed,
      parsedRecord,
      responseMessage,
    };
  }

  private buildPayphoneReverseFailureMessage(input: {
    status: number;
    raw: string;
    responseMessage: string | null;
    method: 'id' | 'client';
    usedCredentialSnapshot: boolean;
  }) {
    if (input.responseMessage) {
      return `No se pudo reversar el pago: ${input.responseMessage}`;
    }

    const identifier =
      input.method === 'id'
        ? 'transactionId'
        : 'clientTransactionId';
    const trimmed = input.raw.trim();

    if (!trimmed) {
      return input.usedCredentialSnapshot
        ? `Error en el servicio de Payphone al reversar por ${identifier} (HTTP ${input.status}). Si el problema continúa, puede ser una incidencia temporal del proveedor.`
        : `Error en el servicio de Payphone al reversar por ${identifier} (HTTP ${input.status}). Payphone exige usar el mismo token con el que se creó la transacción; si el token del tenant cambió después del cobro, el reverso puede fallar.`;
    }

    if (/<!DOCTYPE|<html/i.test(trimmed)) {
      return input.usedCredentialSnapshot
        ? `Payphone respondió con error interno al reversar por ${identifier} (HTTP ${input.status}). Si el problema continúa, puede ser una incidencia temporal del proveedor.`
        : `Payphone respondió con error interno al reversar por ${identifier} (HTTP ${input.status}). Revisa que el token actual del tenant siga siendo el mismo con el que se creó la transacción.`;
    }

    const snippet = trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
    return `No se pudo reversar el pago con Payphone por ${identifier} (HTTP ${input.status}): ${snippet}`;
  }

  private normalizePayphoneReverseId(value: string) {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }

    return trimmed;
  }

  private async requestPayphoneReverse(input: {
    token: string;
    method: 'id' | 'client';
    value: string;
    usedCredentialSnapshot: boolean;
  }) {
    const url =
      input.method === 'id'
        ? 'https://pay.payphonetodoesposible.com/api/Reverse'
        : 'https://pay.payphonetodoesposible.com/api/Reverse/Client';
    const body =
      input.method === 'id'
        ? { id: this.normalizePayphoneReverseId(input.value) }
        : { clientId: input.value };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    const { parsed, parsedRecord, responseMessage } = this.parsePayphoneReverseResponse(raw);
    const success =
      response.ok
      && (
        parsed === true
        || parsedRecord?.success === true
        || (
          parsedRecord == null
          && responseMessage == null
          && !raw.trim()
        )
      );

    return {
      success,
      status: response.status,
      raw,
      parsed,
      parsedRecord,
      responseMessage,
      failureMessage: this.buildPayphoneReverseFailureMessage({
        status: response.status,
        raw,
        responseMessage,
        method: input.method,
        usedCredentialSnapshot: input.usedCredentialSnapshot,
      }),
    };
  }

  private async reversePayphoneTransaction(input: {
    tenantId: string;
    transaction: PayphoneTransactionEntity;
  }) {
    const settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId: input.tenantId },
    });
    const bookingPayload = input.transaction.bookingPayload as {
      credentialSnapshot?: { token?: string | null };
    } | null;
    const credentialSnapshotToken = String(bookingPayload?.credentialSnapshot?.token ?? '').trim();
    const token = credentialSnapshotToken || String(settings?.payphoneToken ?? '').trim();
    if (!token) {
      throw new BadRequestException('No se pudo reversar el pago: falta configurar el token de Payphone para este tenant');
    }

    if (!input.transaction.payphoneTransactionId) {
      throw new BadRequestException('No se pudo reversar el pago: la transacción de Payphone no está confirmada');
    }

    const timezone = settings?.timezone ?? AppointmentsService.DEFAULT_TIMEZONE;
    const transactionDate = input.transaction.confirmedAt ?? input.transaction.createdAt;
    if (!this.isPayphoneReverseWindowOpen(transactionDate, new Date(), timezone)) {
      throw new BadRequestException('No se pudo reversar el pago: Payphone solo permite reversos el mismo día hasta las 20:00');
    }

    const reverseById = await this.requestPayphoneReverse({
      token,
      method: 'id',
      value: String(input.transaction.payphoneTransactionId),
      usedCredentialSnapshot: Boolean(credentialSnapshotToken),
    });

    if (!reverseById.success) {
      this.logger.warn({
        event: 'payphone.reverse.failed_by_id',
        tenantId: input.tenantId,
        appointmentId: input.transaction.appointmentId,
        payphoneTransactionId: input.transaction.payphoneTransactionId,
        clientTransactionId: input.transaction.clientTransactionId,
        httpStatus: reverseById.status,
        usedCredentialSnapshot: Boolean(credentialSnapshotToken),
        bodyPreview: reverseById.raw.slice(0, 800),
      });

      const reverseByClient = await this.requestPayphoneReverse({
        token,
        method: 'client',
        value: input.transaction.clientTransactionId,
        usedCredentialSnapshot: Boolean(credentialSnapshotToken),
      });

      if (!reverseByClient.success) {
        this.logger.warn({
          event: 'payphone.reverse.failed_by_client_id',
          tenantId: input.tenantId,
          appointmentId: input.transaction.appointmentId,
          payphoneTransactionId: input.transaction.payphoneTransactionId,
          clientTransactionId: input.transaction.clientTransactionId,
          httpStatus: reverseByClient.status,
          usedCredentialSnapshot: Boolean(credentialSnapshotToken),
          bodyPreview: reverseByClient.raw.slice(0, 800),
        });

        const fallbackMessage =
          reverseByClient.failureMessage === reverseById.failureMessage
            ? reverseByClient.failureMessage
            : `${reverseById.failureMessage} Intento alterno por clientTransactionId: ${reverseByClient.failureMessage}`;
        throw new BadRequestException(fallbackMessage);
      }
    }

    input.transaction.status = 'cancelled';
    input.transaction.errorMessage = null;
    await this.payphoneTransactionsRepository.save(input.transaction);
  }

  private async applyReminderState(appointment: AppointmentEntity) {
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      appointment.reminderScheduledAt = null;
      appointment.reminderSentAt = null;
      appointment.reminderError = null;
      return appointment;
    }

    const tenantPlan = appointment.tenant?.plan ? normalizePlanCode(appointment.tenant.plan) : null;
    const supportsReminders = tenantPlan
      ? getPlanMetadata(tenantPlan).features.includes('appointment_reminders')
      : true;

    if (!supportsReminders) {
      appointment.reminderScheduledAt = null;
      appointment.reminderSentAt = null;
      appointment.reminderError = null;
      return appointment;
    }

    appointment.reminderScheduledAt = this.computeReminderScheduledAt(appointment.startDateTime);
    appointment.reminderSentAt = null;
    appointment.reminderError = null;
    return appointment;
  }

  private async resolveAppointmentCustomer(
    tenantId: string,
    input: {
      customerId?: string;
      customer?: {
        fullName: string;
        email: string;
        phone: string;
        identification?: string;
        notes?: string;
      };
    },
  ) {
    if (input.customerId) {
      const customer = await this.customersRepository.findOne({
        where: { id: input.customerId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      return customer;
    }

    if (input.customer) {
      return this.customersRepository.save({
        tenantId,
        fullName: input.customer.fullName,
        email: input.customer.email.toLowerCase(),
        phone: input.customer.phone,
        identification: input.customer.identification ?? null,
        notes: input.customer.notes ?? null,
        tags: null,
      });
    }

    throw new BadRequestException('Debe seleccionar un cliente existente o crear uno nuevo');
  }

  private getAppointmentStatusLabel(status: AppointmentEntity['status'], locale: 'es' | 'en' = 'es') {
    switch (status) {
      case 'pending':
        return locale === 'en' ? 'Pending management' : 'Pendiente de gestión';
      case 'confirmed':
        return locale === 'en' ? 'Confirmed' : 'Confirmada';
      case 'cancelled':
        return locale === 'en' ? 'Cancelled' : 'Cancelada';
      case 'completed':
        return locale === 'en' ? 'Completed' : 'Completada';
      case 'no_show':
        return locale === 'en' ? 'No-show' : 'No asistió';
      default:
        return locale === 'en' ? 'Updated' : 'Actualizada';
    }
  }

  private async sendAppointmentCreatedNotifications(appointmentId: string) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId },
      relations: ['tenant', 'customer', 'service', 'staff'],
    });

    if (!appointment?.tenant) {
      return;
    }

    const planMetadata = getPlanMetadata(normalizePlanCode(appointment.tenant.plan));
    if (!planMetadata.features.includes('email_notifications')) {
      return;
    }

    const settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId: appointment.tenantId },
    });
    const locale = this.resolveLocale(settings?.locale);
    const staffPhotoUrl = await this.filesService.resolveStoredReference(appointment.staff?.avatarUrl, appointment.tenantId);
    const statusLabel = this.getAppointmentStatusLabel(appointment.status, locale);

    if (appointment.customer?.email) {
      try {
        await this.mailService.sendAppointmentConfirmationEmail({
          to: appointment.customer.email,
          tenantId: appointment.tenantId,
          recipientName: appointment.customer.fullName,
          serviceName: appointment.service?.name ?? 'tu cita',
          staffName: appointment.staff?.name ?? null,
          staffPhotoUrl,
          startDateTime: appointment.startDateTime,
          statusLabel,
          contactPhone: settings?.contactPhone ?? null,
          contactAddress: settings?.contactAddress ?? null,
        });
      } catch (error) {
        this.logger.error(
          `No se pudo enviar correo de confirmación para la cita ${appointment.id}: ${
            error instanceof Error ? error.stack ?? error.message : 'error desconocido'
          }`,
        );
      }
    }

    await this.sendAppointmentStaffNotification(appointment, 'created', {
      settings,
      startDateTime: appointment.startDateTime,
      statusLabel,
    });
  }

  private async sendAppointmentStaffNotification(
    appointment: AppointmentEntity,
    notificationKind: 'created' | 'updated',
    context?: {
      settings?: TenantSettingEntity | null;
      startDateTime?: Date | string;
      statusLabel?: string;
    },
  ) {
    if (!appointment.staff) {
      return;
    }

    const effectiveAppointment = appointment.customer && appointment.service && appointment.tenant
      ? appointment
      : await this.appointmentsRepository.findOne({
        where: { id: appointment.id },
        relations: ['tenant', 'customer', 'service', 'staff'],
      });

    if (!effectiveAppointment?.tenant) {
      return;
    }

    const planMetadata = getPlanMetadata(normalizePlanCode(effectiveAppointment.tenant.plan));
    if (!planMetadata.features.includes('email_notifications')) {
      return;
    }

    const settings = context?.settings ?? await this.tenantSettingsRepository.findOne({
      where: { tenantId: effectiveAppointment.tenantId },
    });
    const locale = this.resolveLocale(settings?.locale);
    const staff = effectiveAppointment.staff;

    if (!staff?.email) {
      this.logger.warn(`La cita ${effectiveAppointment.id} tiene profesional asignado sin correo de notificación.`);
      return;
    }

    const startDateTime = context?.startDateTime ?? effectiveAppointment.startDateTime;
    const statusLabel =
      context?.statusLabel
      ?? this.getAppointmentStatusLabel(effectiveAppointment.status, locale);

    try {
      await this.mailService.sendAppointmentStaffNotificationEmail({
        to: staff.email,
        tenantId: effectiveAppointment.tenantId,
        recipientName: staff.name ?? null,
        notificationKind,
        customerName: effectiveAppointment.customer?.fullName ?? 'Cliente',
        customerEmail: effectiveAppointment.customer?.email ?? 'sin-correo',
        customerPhone: effectiveAppointment.customer?.phone ?? null,
        serviceName: effectiveAppointment.service?.name ?? 'tu servicio',
        startDateTime,
        statusLabel,
        contactPhone: settings?.contactPhone ?? null,
        contactAddress: settings?.contactAddress ?? null,
        notes: effectiveAppointment.notes ?? null,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar correo al profesional para la cita ${effectiveAppointment.id}: ${
          error instanceof Error ? error.stack ?? error.message : 'error desconocido'
        }`,
      );
    }
  }

  private async persistAppointmentAndNotify(input: {
    tenantId: string;
    serviceId: string;
    staffId?: string | null;
    paymentMethod: PaymentMethod;
    startDateTime: Date;
    endDateTime: Date;
    status: AppointmentEntity['status'];
    customer: CustomerEntity;
    notes?: string | null;
    internalNotes?: string | null;
  }) {
    const appointment = await this.appointmentsRepository.save({
      tenantId: input.tenantId,
      customerId: input.customer.id,
      serviceId: input.serviceId,
      staffId: input.staffId ?? null,
      source: 'admin',
      status: input.status,
      paymentMethod: input.paymentMethod,
      startDateTime: input.startDateTime,
      endDateTime: input.endDateTime,
      notes: input.notes ?? null,
      internalNotes: input.internalNotes ?? null,
      reminderScheduledAt: null,
      reminderSentAt: null,
      reminderError: null,
    });

    const hydratedAppointment = await this.appointmentsRepository.findOne({
      where: { id: appointment.id },
      relations: ['tenant', 'customer', 'service', 'staff'],
    });

    if (hydratedAppointment) {
      await this.applyReminderState(hydratedAppointment);
      await this.appointmentsRepository.save(hydratedAppointment);
      await this.sendAppointmentCreatedNotifications(hydratedAppointment.id);
      return hydratedAppointment;
    }

    return appointment;
  }

  private toDateWithTime(date: string, time: string, timeZone: string) {
    return this.zonedDateTimeToUtc(date, time, timeZone);
  }

  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart < bEnd && bStart < aEnd;
  }

  private isBlockingStatus(status?: string | null) {
    return AppointmentsService.BLOCKING_STATUSES.includes(
      status as (typeof AppointmentsService.BLOCKING_STATUSES)[number],
    );
  }

  private getMinimumBookableStart() {
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  private isRuleCompatible(rule: AvailabilityRuleEntity, startDateTime: Date, endDateTime: Date, timeZone: string) {
    const ruleStart = this.normalizeTimeValue(rule.startTime);
    const ruleEnd = this.normalizeTimeValue(rule.endTime);
    const startTime = this.normalizeTimeValue(this.getLocalTimeString(startDateTime, timeZone));
    const endTime = this.normalizeTimeValue(this.getLocalTimeString(endDateTime, timeZone));
    return ruleStart <= startTime && ruleEnd >= endTime;
  }

  private async getEligibleStaffIds(serviceId: string, requestedStaffId?: string) {
    const links = await this.staffServicesRepository.find({
      where: { serviceId },
    });

    const eligibleStaffIds = [...new Set(links.map((link) => link.staffId))];
    if (eligibleStaffIds.length === 0) {
      return [];
    }

    if (!requestedStaffId) {
      return eligibleStaffIds;
    }

    return eligibleStaffIds.includes(requestedStaffId) ? [requestedStaffId] : [];
  }

  private async ensureAppointmentSlotAvailable(input: {
    tenantId: string;
    serviceId: string;
    startDateTime: Date;
    endDateTime: Date;
    staffId?: string | null;
    ignoreAppointmentId?: string;
  }) {
    const timeZone = await this.getTenantTimezone(input.tenantId);
    const eligibleStaffIds = await this.getEligibleStaffIds(input.serviceId, input.staffId ?? undefined);
    if (eligibleStaffIds.length === 0) {
      throw new BadRequestException('El servicio seleccionado no tiene profesionales disponibles');
    }

    const appointments = await this.appointmentsRepository.find({
      where: { tenantId: input.tenantId },
    });
    const blocks = await this.scheduleBlocksRepository.find({
      where: input.staffId
        ? [{ tenantId: input.tenantId, staffId: input.staffId }, { tenantId: input.tenantId, staffId: IsNull() }]
        : [
          ...eligibleStaffIds.map((staffId) => ({ tenantId: input.tenantId, staffId })),
          { tenantId: input.tenantId, staffId: IsNull() },
        ],
    });

    const hasAppointment = appointments.some((appointment) => {
      if (input.ignoreAppointmentId && appointment.id === input.ignoreAppointmentId) {
        return false;
      }

      if (!this.isBlockingStatus(appointment.status)) {
        return false;
      }

      if (input.staffId) {
        return (appointment.staffId === input.staffId || appointment.staffId == null)
          && this.overlaps(input.startDateTime, input.endDateTime, appointment.startDateTime, appointment.endDateTime);
      }

      return (appointment.staffId == null || eligibleStaffIds.includes(appointment.staffId))
        && this.overlaps(input.startDateTime, input.endDateTime, appointment.startDateTime, appointment.endDateTime);
    });

    if (hasAppointment) {
      throw new BadRequestException('Ya existe una reserva en ese horario');
    }

    const hasBlock = blocks.some((block) =>
      this.overlaps(input.startDateTime, input.endDateTime, block.startDateTime, block.endDateTime),
    );

    if (hasBlock) {
      throw new BadRequestException('El horario está bloqueado en agenda');
    }

    const dayOfWeek = this.getLocalDayOfWeek(input.startDateTime, timeZone);
    const rules = await this.availabilityRepository.find({
      where: { tenantId: input.tenantId, dayOfWeek, isActive: true, staffId: In(eligibleStaffIds) },
    });
    const matchingRules = input.staffId
      ? rules.filter((rule) => rule.staffId === input.staffId)
      : rules;

    const coveredByRule = matchingRules.some((rule) =>
      this.isRuleCompatible(rule, input.startDateTime, input.endDateTime, timeZone),
    );

    if (!coveredByRule) {
      throw new BadRequestException('El horario seleccionado ya no está disponible');
    }
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailabilitySlot[]> {
    const service = await this.servicesService.findOne(query.serviceId);
    if (service.tenantId !== query.tenantId) {
      throw new NotFoundException('Service not found');
    }
    const timeZone = await this.getTenantTimezone(query.tenantId);

    const eligibleStaffIds = await this.getEligibleStaffIds(query.serviceId, query.staffId);
    if (eligibleStaffIds.length === 0) {
      return [];
    }

    const { dayStart, dayEnd } = this.getTenantDayRange(query.date, timeZone);
    const dayOfWeek = this.getLocalDayOfWeek(dayStart, timeZone);

    const rules = await this.availabilityRepository.find({
      where: { tenantId: query.tenantId, dayOfWeek, isActive: true, staffId: In(eligibleStaffIds) },
      relations: { staff: true },
    });
    const filteredRules = query.staffId ? rules.filter((rule) => rule.staffId === query.staffId) : rules;

    const [appointments, blocks] = await Promise.all([
      this.appointmentsRepository.find({
        where: { tenantId: query.tenantId },
      }),
      this.scheduleBlocksRepository.find({
        where: query.staffId
          ? [{ tenantId: query.tenantId, staffId: query.staffId }, { tenantId: query.tenantId, staffId: IsNull() }]
          : [
            ...eligibleStaffIds.map((staffId) => ({ tenantId: query.tenantId, staffId })),
            { tenantId: query.tenantId, staffId: IsNull() },
          ],
      }),
    ]);

    const sameDayAppointments = appointments.filter(
      (appointment) =>
        AppointmentsService.BLOCKING_STATUSES.includes(appointment.status as (typeof AppointmentsService.BLOCKING_STATUSES)[number])
        && appointment.startDateTime >= dayStart
        && appointment.startDateTime <= dayEnd
        && (appointment.staffId == null || eligibleStaffIds.includes(appointment.staffId)),
    );
    const sameDayBlocks = blocks.filter(
      (block) => block.startDateTime <= dayEnd && block.endDateTime >= dayStart,
    );
    const minimumBookableStart = this.getMinimumBookableStart();

    const slots: AvailabilitySlot[] = [];

    for (const rule of filteredRules) {
      const interval = rule.slotIntervalMinutes;
      let current = this.toDateWithTime(query.date, rule.startTime, timeZone);
      const end = this.toDateWithTime(query.date, rule.endTime, timeZone);

      while (current < end) {
        const slotEnd = new Date(current.getTime() + service.durationMinutes * 60 * 1000);
        if (slotEnd > end) {
          break;
        }

        if (current < minimumBookableStart) {
          current = new Date(current.getTime() + interval * 60 * 1000);
          continue;
        }

        const hasAppointment = sameDayAppointments.some((appointment) =>
          (appointment.staffId === rule.staffId || appointment.staffId == null)
          && this.overlaps(current, slotEnd, appointment.startDateTime, appointment.endDateTime),
        );
        const hasBlock = sameDayBlocks.some((block) =>
          (block.staffId === rule.staffId || block.staffId == null)
          && this.overlaps(current, slotEnd, block.startDateTime, block.endDateTime),
        );

        let unavailableReason: string | null = null;
        if (hasAppointment) {
          unavailableReason = 'Horario reservado';
        } else if (hasBlock) {
          unavailableReason = 'Horario bloqueado';
        }

        slots.push({
          start: current.toISOString(),
          end: slotEnd.toISOString(),
          staffId: rule.staffId,
          staffName: rule.staff?.name ?? null,
          available: unavailableReason == null,
          unavailableReason,
        });

        current = new Date(current.getTime() + interval * 60 * 1000);
      }
    }

    return slots.sort(
      (left, right) =>
        left.start.localeCompare(right.start)
        || Number(right.available) - Number(left.available)
        || (left.staffName ?? '').localeCompare(right.staffName ?? ''),
    );
  }

  async createPublicAppointment(tenantId: string, input: {
    serviceId: string;
    staffId?: string;
    startDateTime: string;
    paymentMethod?: string;
    customer: {
      fullName: string;
      email: string;
      phone: string;
      notes?: string;
    };
    notes?: string;
  }) {
    const service = await this.servicesService.findOne(input.serviceId);
    const startDateTime = new Date(input.startDateTime);
    const endDateTime = new Date(startDateTime.getTime() + service.durationMinutes * 60 * 1000);
    const settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });
    const paymentMethod = this.resolvePaymentMethod(settings, input.paymentMethod);

    await this.ensureAppointmentSlotAvailable({
      tenantId,
      serviceId: input.serviceId,
      startDateTime,
      endDateTime,
      staffId: input.staffId ?? null,
    });

    let customer = await this.customersRepository.findOne({
      where: { tenantId, email: input.customer.email.toLowerCase() },
    });

    if (!customer) {
      customer = await this.customersRepository.save({
        tenantId,
        fullName: input.customer.fullName,
        email: input.customer.email.toLowerCase(),
        phone: input.customer.phone,
        notes: input.customer.notes ?? null,
        tags: null,
      });
    }

    const created = await this.persistAppointmentAndNotify({
      tenantId,
      serviceId: service.id,
      staffId: input.staffId ?? null,
      paymentMethod,
      startDateTime,
      endDateTime,
      status: 'pending',
      customer,
      notes: input.notes ?? null,
      internalNotes: null,
    });

    return {
      id: created.id,
      status: created.status,
      startDateTime: created.startDateTime,
      endDateTime: created.endDateTime,
    };
  }

  async createAdminAppointment(tenantId: string, input: CreateAppointmentDto) {
    const service = await this.servicesService.findOne(input.serviceId);
    if (service.tenantId !== tenantId) {
      throw new NotFoundException('Service not found');
    }

    const startDateTime = new Date(input.startDateTime);
    const endDateTime = new Date(startDateTime.getTime() + service.durationMinutes * 60 * 1000);

    const customer = await this.resolveAppointmentCustomer(tenantId, {
      customerId: input.customerId,
      customer: input.customer,
    });
    const settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });
    const paymentMethod = this.resolvePaymentMethod(settings, input.paymentMethod);

    await this.ensureAppointmentSlotAvailable({
      tenantId,
      serviceId: service.id,
      startDateTime,
      endDateTime,
      staffId: input.staffId ?? null,
    });

    const created = await this.persistAppointmentAndNotify({
      tenantId,
      serviceId: service.id,
      staffId: input.staffId ?? null,
      paymentMethod,
      startDateTime,
      endDateTime,
      status: input.status ?? 'confirmed',
      customer,
      notes: input.notes ?? null,
      internalNotes: input.internalNotes ?? null,
    });

    return {
      id: created.id,
      status: created.status,
      startDateTime: created.startDateTime,
      endDateTime: created.endDateTime,
    };
  }

  listByTenant(tenantId: string) {
    return this.appointmentsRepository.find({
      where: { tenantId },
      relations: ['customer', 'service', 'staff'],
      order: { startDateTime: 'DESC' },
    });
  }

  async updateStatus(appointmentId: string, tenantId: string, status: AppointmentEntity['status']) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['customer', 'service', 'staff', 'tenant'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status === 'completed' && status !== 'completed') {
      throw new BadRequestException('No se puede modificar una reserva completada');
    }

    const previousStatus = appointment.status;
    const shouldValidateSlot = this.isBlockingStatus(status) && !this.isBlockingStatus(previousStatus);

    if (shouldValidateSlot) {
      await this.ensureAppointmentSlotAvailable({
        tenantId,
        serviceId: appointment.serviceId,
        startDateTime: appointment.startDateTime,
        endDateTime: appointment.endDateTime,
        staffId: appointment.staffId,
        ignoreAppointmentId: appointment.id,
      });
    }

    appointment.status = status;
    await this.applyReminderState(appointment);
    const saved = await this.appointmentsRepository.save(appointment);

    if (previousStatus !== status) {
      await this.sendAppointmentStaffNotification(saved, 'updated');
    }

    return saved;
  }

  async updateAppointment(appointmentId: string, tenantId: string, input: UpdateAppointmentDto) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['customer', 'service', 'staff', 'tenant'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status === 'completed' && input.status && input.status !== 'completed') {
      throw new BadRequestException('No se puede modificar una reserva completada');
    }

    let durationMinutes = appointment.service.durationMinutes;
    const previousState = {
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      paymentMethod: appointment.paymentMethod,
      customerId: appointment.customerId,
      startDateTime: appointment.startDateTime.getTime(),
      endDateTime: appointment.endDateTime.getTime(),
      notes: appointment.notes ?? null,
      internalNotes: appointment.internalNotes ?? null,
      status: appointment.status,
    };

    if (input.serviceId && input.serviceId !== appointment.serviceId) {
      const service = await this.servicesService.findOne(input.serviceId);
      appointment.serviceId = service.id;
      durationMinutes = service.durationMinutes;
    }

    if (input.customerId) {
      appointment.customerId = input.customerId;
    }

    if (input.staffId !== undefined) {
      appointment.staffId = input.staffId || null;
    }

    if (input.paymentMethod !== undefined) {
      const settings = await this.tenantSettingsRepository.findOne({
        where: { tenantId },
      });
      appointment.paymentMethod = this.resolvePaymentMethod(settings, input.paymentMethod);
    }

    if (input.startDateTime) {
      const nextStart = new Date(input.startDateTime);
      appointment.startDateTime = nextStart;
      appointment.endDateTime = new Date(nextStart.getTime() + durationMinutes * 60 * 1000);
    }

    if (input.status) {
      if (appointment.status === 'completed' && input.status !== 'completed') {
        throw new BadRequestException('No se puede modificar una reserva completada');
      }
      appointment.status = input.status;
    }

    appointment.notes = input.notes ?? appointment.notes;
    appointment.internalNotes = input.internalNotes ?? appointment.internalNotes;

    const shouldValidateSlot =
      this.isBlockingStatus(appointment.status)
      && (
        previousState.serviceId !== appointment.serviceId
        || previousState.staffId !== appointment.staffId
        || previousState.startDateTime !== appointment.startDateTime.getTime()
        || previousState.endDateTime !== appointment.endDateTime.getTime()
        || !this.isBlockingStatus(previousState.status)
      );

    if (shouldValidateSlot) {
      await this.ensureAppointmentSlotAvailable({
        tenantId,
        serviceId: appointment.serviceId,
        startDateTime: appointment.startDateTime,
        endDateTime: appointment.endDateTime,
        staffId: appointment.staffId,
        ignoreAppointmentId: appointment.id,
      });
    }

    await this.applyReminderState(appointment);
    const saved = await this.appointmentsRepository.save(appointment);
    const shouldNotifyStaff =
      previousState.serviceId !== saved.serviceId
      || previousState.staffId !== saved.staffId
      || previousState.paymentMethod !== saved.paymentMethod
      || previousState.customerId !== saved.customerId
      || previousState.startDateTime !== saved.startDateTime.getTime()
      || previousState.endDateTime !== saved.endDateTime.getTime()
      || previousState.notes !== (saved.notes ?? null)
      || previousState.internalNotes !== (saved.internalNotes ?? null)
      || previousState.status !== saved.status;

    if (shouldNotifyStaff) {
      await this.sendAppointmentStaffNotification(saved, 'updated');
    }

    return saved;
  }

  async reversePayphonePayment(appointmentId: string, tenantId: string) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['customer', 'service', 'staff', 'tenant'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status === 'completed') {
      throw new BadRequestException('No se puede reversar una reserva completada');
    }

    if (appointment.paymentMethod !== 'payphone') {
      throw new BadRequestException('La reserva no fue pagada con Payphone');
    }

    if (appointment.status !== 'cancelled') {
      throw new BadRequestException('Primero debes cancelar la reserva antes de reversar el pago');
    }

    const payphoneTransaction = await this.payphoneTransactionsRepository.findOne({
      where: {
        tenantId,
        appointmentId: appointment.id,
      },
    });

    if (!payphoneTransaction?.payphoneTransactionId || payphoneTransaction.status !== 'approved') {
      throw new BadRequestException('No hay un pago aprobado de Payphone para reversar');
    }

    await this.reversePayphoneTransaction({
      tenantId,
      transaction: payphoneTransaction,
    });

    return {
      success: true,
      appointmentId: appointment.id,
      payphoneTransactionId: payphoneTransaction.payphoneTransactionId,
      status: payphoneTransaction.status,
    };
  }
}
