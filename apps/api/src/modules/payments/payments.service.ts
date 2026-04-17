import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  PayphoneTransactionEntity,
  TenantSettingEntity,
} from 'src/common/entities';
import { ServicesService } from 'src/modules/services/services.service';
import { TenantsService } from 'src/modules/tenants/tenants.service';
import { AppointmentsService } from 'src/modules/appointments/appointments.service';
import { PreparePayphonePaymentDto } from './dto/prepare-payphone-payment.dto';
import { ConfirmPayphonePaymentDto } from './dto/confirm-payphone-payment.dto';
import { ApplyPayphoneClientConfirmDto } from './dto/apply-payphone-client-confirm.dto';
import { PayphoneTestPrepareDto } from './dto/payphone-test-prepare.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PayphoneTransactionEntity)
    private readonly payphoneTransactionsRepository: Repository<PayphoneTransactionEntity>,
    private readonly tenantsService: TenantsService,
    private readonly servicesService: ServicesService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  private toIntegerAmount(value: number) {
    return Math.max(0, Math.round(value * 100));
  }

  private buildResponseUrl(responseUrl: string) {
    return new URL(responseUrl).toString();
  }

  /** Payphone documentación: reference máx. 100 caracteres (cajita / botón). */
  private truncatePayphoneReference(value: string, maxLength = 100) {
    const trimmed = value.trim();
    return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength);
  }

  private formatPayphoneApiError(data: unknown, fallback: string) {
    if (!data || typeof data !== 'object') {
      return fallback;
    }
    const record = data as {
      message?: string;
      errors?: Array<{ message?: string; errorDescriptions?: string[] }>;
    };
    const base = typeof record.message === 'string' && record.message.trim() ? record.message.trim() : fallback;
    if (!Array.isArray(record.errors) || record.errors.length === 0) {
      return base;
    }
    const details = record.errors
      .flatMap((entry) => {
        if (Array.isArray(entry.errorDescriptions) && entry.errorDescriptions.length > 0) {
          return entry.errorDescriptions;
        }
        return entry.message ? [entry.message] : [];
      })
      .filter(Boolean);
    if (details.length === 0) {
      return base;
    }
    return base === fallback ? details.join('; ') : `${base}: ${details.join('; ')}`;
  }

  private buildPayphoneFailureMessage(
    flow: 'prepare' | 'confirm',
    status: number,
    data: unknown,
    raw: string,
  ): string {
    const defaultMsg =
      flow === 'prepare'
        ? 'Payphone no pudo preparar la transacción'
        : 'Payphone no pudo confirmar la transacción';

    const record = data && typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
    const hasMessage = typeof record?.message === 'string' && record.message.trim().length > 0;
    const hasErrors = Array.isArray(record?.errors) && record.errors.length > 0;
    if (hasMessage || hasErrors) {
      return this.formatPayphoneApiError(data, defaultMsg);
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      if (status >= 500) {
        return `Error en el servicio de Payphone (HTTP ${status}). Comprueba que el token y el Store ID sean del mismo entorno (pruebas vs producción) y de la misma aplicación tipo WEB en Payphone Developer. Si el fallo continúa, puede ser una incidencia temporal en Payphone.`;
      }
      return `Payphone rechazó la solicitud (HTTP ${status}). Comprueba dominio y URL de respuesta en Payphone Developer.`;
    }
    if (/<!DOCTYPE|<html/i.test(trimmed)) {
      return `Payphone respondió con error interno (HTTP ${status}). Suele deberse a token o Store ID incorrectos, entorno equivocado (pruebas/producción) o a un fallo temporal del proveedor.`;
    }
    const snippet = trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
    return `${defaultMsg} (HTTP ${status}): ${snippet}`;
  }

  /** Docs: storeId en JSON como string (puede ser UUID o numérico en texto, según Credenciales). */
  private normalizePayphoneStoreId(storeId: string): string {
    return storeId.trim();
  }

  private splitPayphoneCustomerName(fullName: string): { firstName: string; lastName: string } {
    const t = fullName.trim();
    if (!t) {
      return { firstName: 'Cliente', lastName: '.' };
    }
    const space = t.indexOf(' ');
    if (space === -1) {
      return { firstName: t, lastName: '.' };
    }
    return {
      firstName: t.slice(0, space).trim() || 'Cliente',
      lastName: t.slice(space + 1).trim() || '.',
    };
  }

  /** Formato internacional tipo +593XXXXXXXXX (doc Payphone). */
  private normalizePayphoneBillPhone(phone: string): string {
    const d = phone.trim().replace(/\s/g, '');
    if (d.startsWith('+')) {
      return d;
    }
    const digits = d.replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 15) {
      return `+${digits}`;
    }
    return d.startsWith('+') ? d : `+${d}`;
  }

  /**
   * Cuerpo Button/Prepare alineado al ejemplo oficial (fetch/Postman) que devuelve paymentId + URLs.
   * Cobro sin desglose de IVA: todo el monto en amountWithoutTax; lineItems con una sola línea coherente.
   */
  private buildPayphoneButtonPrepareBody(input: {
    amount: number;
    clientTransactionId: string;
    reference: string;
    storeId: string;
    currency: string;
    responseUrl: string;
    cancellationUrl?: string;
    serviceId: string;
    serviceName: string;
    customer: { fullName: string; email: string; phone: string };
  }): Record<string, unknown> {
    const { firstName, lastName } = this.splitPayphoneCustomerName(input.customer.fullName);
    const phoneNumber = this.normalizePayphoneBillPhone(input.customer.phone);
    const email = input.customer.email.trim();
    const lineDesc = input.serviceName.length > 120 ? `${input.serviceName.slice(0, 117)}…` : input.serviceName;

    const body: Record<string, unknown> = {
      amount: input.amount,
      amountWithoutTax: input.amount,
      amountWithTax: 0,
      tax: 0,
      service: 0,
      tip: 0,
      clientTransactionId: input.clientTransactionId,
      reference: input.reference,
      storeId: input.storeId,
      currency: input.currency,
      responseUrl: input.responseUrl,
      timeZone: -5,
      lat: '-1.831239',
      lng: '-78.183406',
      order: {
        billTo: {
          billToId: 1,
          address1: 'Reserva online',
          address2: '',
          country: 'EC',
          state: 'N/D',
          locality: 'N/D',
          firstName,
          lastName,
          phoneNumber,
          email,
          postalCode: 'EC170135',
          customerId: input.clientTransactionId.length <= 80 ? input.clientTransactionId : input.clientTransactionId.slice(0, 80),
          ipAddress: '127.0.0.1',
        },
        lineItems: [
          {
            productName: input.serviceName.length > 80 ? `${input.serviceName.slice(0, 77)}…` : input.serviceName,
            unitPrice: input.amount,
            quantity: 1,
            totalAmount: input.amount,
            taxAmount: 0,
            productSKU: input.serviceId.replace(/-/g, '').slice(0, 24) || '1',
            productDescription: lineDesc,
          },
        ],
      },
      documentId: null,
      phoneNumber: null,
      email: null,
      optionalParameter: input.reference.length > 200 ? input.reference.slice(0, 200) : input.reference,
    };

    if (input.cancellationUrl) {
      body.cancellationUrl = input.cancellationUrl;
    }

    return body;
  }

  /** Respuesta JSON de Payphone; si el cuerpo no es JSON válido, error claro. */
  private parsePayphoneSuccessBody(raw: string, api: 'Prepare' | 'Confirm'): unknown {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new BadRequestException(`Payphone (${api}) devolvió cuerpo vacío`);
    }
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new BadRequestException(`Payphone (${api}) devolvió un cuerpo que no es JSON válido`);
    }
  }

  /** Identifica credenciales en logs sin volcar el token completo. */
  private maskPayphoneTokenForLog(token: string): string {
    const t = token.trim();
    if (!t) {
      return '(vacío)';
    }
    if (t.length <= 16) {
      return `len=${t.length} (oculto)`;
    }
    return `len=${t.length} sufijo=…${t.slice(-10)}`;
  }

  private payphoneLogContext(meta: {
    payphoneMode: string | null | undefined;
    token: string;
    storeId: string;
    api: 'Button/Prepare' | 'Button/V2/Confirm';
  }) {
    return {
      payphoneIntegrationMode: meta.payphoneMode ?? '(no definido en tenant)',
      payphoneApi: meta.api,
      httpMethod: 'POST' as const,
      payphoneStoreId: meta.storeId.trim() || '(vacío)',
      payphoneToken: this.maskPayphoneTokenForLog(meta.token),
    };
  }

  private throwPayphoneHttpError(flow: 'prepare' | 'confirm', status: number, data: unknown, raw: string): never {
    const message = this.buildPayphoneFailureMessage(flow, status, data, raw);
    const maxRaw = 96 * 1024;
    const payphoneRawBody = raw.length > maxRaw ? `${raw.slice(0, maxRaw)}…[truncado]` : raw;
    throw new BadRequestException({
      message,
      payphoneHttpStatus: status,
      payphoneRawBody,
      payphoneParsed:
        data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : undefined,
    });
  }

  async preparePayphonePayment(tenantId: string, input: PreparePayphonePaymentDto) {
    const tenant = await this.tenantsService.getTenantProfile(tenantId);
    const settings = tenant.settings as TenantSettingEntity | null;

    if (!(settings?.payphonePaymentEnabled ?? false)) {
      throw new BadRequestException('Payphone no está habilitado para este tenant');
    }

    const service = await this.servicesService.findOne(input.serviceId);
    if (service.tenantId !== tenantId) {
      throw new NotFoundException('Service not found');
    }

    if (service.price == null || service.price <= 0) {
      throw new BadRequestException('El servicio debe tener un precio mayor a cero para usar Payphone');
    }

    const amount = this.toIntegerAmount(service.price);
    const clientTransactionId = randomUUID();
    const paymentMethod = 'payphone';
    const responseUrl = this.buildResponseUrl(input.responseUrl);

    const transaction = this.payphoneTransactionsRepository.create({
      tenantId,
      clientTransactionId,
      status: 'pending',
      paymentMethod,
      amount,
      currency: settings?.currency ?? 'USD',
      responseUrl,
      cancellationUrl: input.cancellationUrl?.trim() || null,
      reference: this.truncatePayphoneReference(`Reserva ${service.name}`),
      customerEmail: input.customer.email.toLowerCase(),
      customerPhone: input.customer.phone,
      customerDocumentId: null,
      bookingPayload: {
        serviceId: input.serviceId,
        staffId: input.staffId ?? null,
        startDateTime: input.startDateTime,
        customer: input.customer,
        notes: input.notes ?? null,
      },
      prepareResponse: null,
      confirmResponse: null,
      appointmentId: null,
      confirmedAt: null,
      errorMessage: null,
    });

    const saved = await this.payphoneTransactionsRepository.save(transaction);

    const reference = this.truncatePayphoneReference(`Reserva ${service.name}`);
    const currency = settings?.currency ?? 'USD';
    const payphoneMode = String(settings?.payphoneMode ?? 'redirect').toLowerCase().trim() === 'box' ? 'box' : 'redirect';

    if (payphoneMode === 'box') {
      if (!(settings?.payphoneToken ?? '').trim() || !(settings?.payphoneStoreId ?? '').trim()) {
        throw new BadRequestException('Payphone cajita requiere token y Store ID configurados');
      }
      saved.prepareResponse = {
        integration: 'payphone-payment-box',
        clientTransactionId,
        amount,
        currency,
        reference,
      };
      await this.payphoneTransactionsRepository.save(saved);

      return {
        clientTransactionId,
        payphoneFlow: 'box' as const,
        redirectUrl: '',
        amount,
        currency,
        reference,
        payWithPayPhone: null,
        payWithCard: null,
        payphonePrepare: saved.prepareResponse as Record<string, unknown>,
        payphonePrepareRaw: null,
      };
    }

    const { data: prepareResponse, raw: prepareRaw } = await this.requestPayphonePrepare(
      {
        token: settings?.payphoneToken ?? '',
        storeId: settings?.payphoneStoreId ?? '',
        amount,
        clientTransactionId,
        currency,
        responseUrl,
        cancellationUrl: input.cancellationUrl?.trim() || undefined,
        reference,
        serviceId: service.id,
        serviceName: service.name,
        customer: input.customer,
      },
      {
        payphoneMode: settings?.payphoneMode,
        token: settings?.payphoneToken ?? '',
        storeId: String(settings?.payphoneStoreId ?? ''),
      },
    );

    saved.prepareResponse = prepareResponse as Record<string, unknown>;
    await this.payphoneTransactionsRepository.save(saved);

    const redirectUrl =
      String((prepareResponse as { payWithCard?: string; payWithPayPhone?: string }).payWithPayPhone ?? '')
      || String((prepareResponse as { payWithCard?: string }).payWithCard ?? '');

    if (!redirectUrl) {
      throw new BadRequestException('Payphone no devolvió una URL de redirección válida');
    }

    return {
      clientTransactionId,
      payphoneFlow: 'redirect' as const,
      redirectUrl,
      amount,
      currency,
      reference,
      payWithPayPhone: (prepareResponse as { payWithPayPhone?: string }).payWithPayPhone ?? null,
      payWithCard: (prepareResponse as { payWithCard?: string }).payWithCard ?? null,
      /** Objeto JSON parseado tal como lo devuelve Button/Prepare (mismas propiedades). */
      payphonePrepare: prepareResponse as Record<string, unknown>,
      /** Cuerpo de la respuesta HTTP de Payphone, sin modificar (string UTF-8 original). */
      payphonePrepareRaw: prepareRaw,
    };
  }

  /**
   * Cobro de prueba desde el panel admin (sin servicio/reserva). El mismo `clientTransactionId` y credenciales
   * quedan en `bookingPayload.credentialSnapshot` para que Confirm funcione aunque el token aún no esté guardado.
   */
  async preparePayphoneTestPayment(tenantId: string, input: PayphoneTestPrepareDto) {
    const tenant = await this.tenantsService.getTenantProfile(tenantId);
    const settings = tenant.settings as TenantSettingEntity | null;

    const effectiveToken = String(input.payphoneToken ?? settings?.payphoneToken ?? '').trim();
    const effectiveStoreId = String(input.payphoneStoreId ?? settings?.payphoneStoreId ?? '').trim();
    const modeFromSettings = String(settings?.payphoneMode ?? 'redirect').toLowerCase().trim() === 'box' ? 'box' : 'redirect';
    const payphoneMode = input.payphoneMode ?? modeFromSettings;

    if (!effectiveToken || !effectiveStoreId) {
      throw new BadRequestException('Configura token y Store ID de Payphone en el formulario o guárdalos en el tenant para la prueba');
    }

    const amount = input.amountCents ?? 100;
    const clientTransactionId = randomUUID();
    const responseUrl = this.buildResponseUrl(input.responseUrl);
    const currency = settings?.currency ?? 'USD';

    const customerFull = input.customerFullName?.trim() || 'Prueba Payphone (admin)';
    const customerEmail = input.customerEmail?.trim() || settings?.contactEmail?.trim() || 'prueba@example.com';
    const customerPhone = input.customerPhone?.trim() || settings?.contactPhone?.trim() || '+593999999999';

    const reference = this.truncatePayphoneReference('Prueba administración Payphone');
    const startIso = new Date().toISOString();

    const bookingPayload: Record<string, unknown> = {
      isPayphoneTest: true,
      serviceId: '123e4567-e89b-12d3-a456-426614174000',
      staffId: null,
      startDateTime: startIso,
      customer: {
        fullName: customerFull,
        email: customerEmail,
        phone: customerPhone,
        notes: 'Pago de prueba desde panel admin',
      },
      notes: null,
      credentialSnapshot: {
        token: effectiveToken,
        storeId: effectiveStoreId,
        payphoneMode,
      },
    };

    const transaction = this.payphoneTransactionsRepository.create({
      tenantId,
      clientTransactionId,
      status: 'pending',
      paymentMethod: 'payphone',
      amount,
      currency,
      responseUrl,
      cancellationUrl: input.cancellationUrl?.trim() || null,
      reference,
      customerEmail: customerEmail.toLowerCase(),
      customerPhone,
      customerDocumentId: null,
      bookingPayload,
      prepareResponse: null,
      confirmResponse: null,
      appointmentId: null,
      confirmedAt: null,
      errorMessage: null,
    });

    const saved = await this.payphoneTransactionsRepository.save(transaction);

    if (payphoneMode === 'box') {
      saved.prepareResponse = {
        integration: 'payphone-payment-box',
        clientTransactionId,
        amount,
        currency,
        reference,
      };
      await this.payphoneTransactionsRepository.save(saved);

      return {
        clientTransactionId,
        payphoneFlow: 'box' as const,
        redirectUrl: '',
        amount,
        currency,
        reference,
        payphoneBox: { token: effectiveToken, storeId: effectiveStoreId },
        payWithPayPhone: null,
        payWithCard: null,
        payphonePrepare: saved.prepareResponse as Record<string, unknown>,
        payphonePrepareRaw: null,
      };
    }

    const { data: prepareResponse, raw: prepareRaw } = await this.requestPayphonePrepare(
      {
        token: effectiveToken,
        storeId: effectiveStoreId,
        amount,
        clientTransactionId,
        currency,
        responseUrl,
        cancellationUrl: input.cancellationUrl?.trim() || undefined,
        reference,
        serviceId: '123e4567-e89b-12d3-a456-426614174000',
        serviceName: 'Prueba de pago (admin)',
        customer: {
          fullName: customerFull,
          email: customerEmail,
          phone: customerPhone,
        },
      },
      {
        payphoneMode,
        token: effectiveToken,
        storeId: effectiveStoreId,
      },
    );

    saved.prepareResponse = prepareResponse as Record<string, unknown>;
    await this.payphoneTransactionsRepository.save(saved);

    const redirectUrl =
      String((prepareResponse as { payWithCard?: string; payWithPayPhone?: string }).payWithPayPhone ?? '')
      || String((prepareResponse as { payWithCard?: string }).payWithCard ?? '');

    if (!redirectUrl) {
      throw new BadRequestException('Payphone no devolvió una URL de redirección válida');
    }

    return {
      clientTransactionId,
      payphoneFlow: 'redirect' as const,
      redirectUrl,
      amount,
      currency,
      reference,
      payWithPayPhone: (prepareResponse as { payWithPayPhone?: string }).payWithPayPhone ?? null,
      payWithCard: (prepareResponse as { payWithCard?: string }).payWithCard ?? null,
      payphonePrepare: prepareResponse as Record<string, unknown>,
      payphonePrepareRaw: prepareRaw,
    };
  }

  async confirmPayphonePayment(tenantId: string, input: ConfirmPayphonePaymentDto) {
    const transaction = await this.payphoneTransactionsRepository.findOne({
      where: {
        tenantId,
        clientTransactionId: input.clientTxId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Payment intent not found');
    }

    if (transaction.appointmentId) {
      return {
        status: transaction.status,
        appointmentId: transaction.appointmentId,
        clientTransactionId: transaction.clientTransactionId,
        transaction: transaction.confirmResponse,
      };
    }

    const settings = await this.tenantsService.getTenantProfile(tenantId);
    const tenantSettings = settings.settings as TenantSettingEntity | null;

    const rawPayload = transaction.bookingPayload as Record<string, unknown>;
    const snap = rawPayload.credentialSnapshot as { token?: string; storeId?: string; payphoneMode?: string } | undefined;
    const useTestSnap = rawPayload.isPayphoneTest === true && snap?.token && snap?.storeId;

    const confirmToken = useTestSnap ? String(snap!.token).trim() : String(tenantSettings?.payphoneToken ?? '').trim();
    const confirmStoreId = useTestSnap ? String(snap!.storeId).trim() : String(tenantSettings?.payphoneStoreId ?? '').trim();
    const confirmMode = useTestSnap ? snap!.payphoneMode : tenantSettings?.payphoneMode;

    const { data: confirmResponse, raw: confirmRaw } = await this.requestPayphoneConfirm(
      {
        token: confirmToken,
        id: input.id,
        clientTxId: input.clientTxId,
      },
      {
        payphoneMode: confirmMode,
        token: confirmToken,
        storeId: confirmStoreId,
      },
    );

    return this.finalizePayphoneAfterConfirmJson(
      tenantId,
      transaction,
      input.id,
      confirmResponse as Record<string, unknown>,
      confirmRaw,
    );
  }

  /**
   * Persiste el JSON de `V2/Confirm` obtenido en el navegador. No llama a Payphone desde el servidor.
   */
  async applyPayphoneClientConfirm(tenantId: string, input: ApplyPayphoneClientConfirmDto) {
    const transaction = await this.payphoneTransactionsRepository.findOne({
      where: {
        tenantId,
        clientTransactionId: input.clientTxId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Payment intent not found');
    }

    if (transaction.appointmentId) {
      return {
        status: transaction.status,
        appointmentId: transaction.appointmentId,
        clientTransactionId: transaction.clientTransactionId,
        transaction: transaction.confirmResponse,
      };
    }

    const payload = input.confirmPayload;
    const payphoneTid = String(payload.transactionId ?? '').trim();
    if (!payphoneTid || payphoneTid !== input.id) {
      throw new BadRequestException('La respuesta de Payphone no coincide con el id de la transacción');
    }
    const clientFromPayphone = String(payload.clientTransactionId ?? '');
    if (clientFromPayphone !== input.clientTxId) {
      throw new BadRequestException('La respuesta de Payphone no coincide con clientTransactionId');
    }
    if (payload.amount !== undefined && payload.amount !== null) {
      const reported = Math.round(Number(payload.amount));
      if (reported !== transaction.amount) {
        throw new BadRequestException('El monto devuelto por Payphone no coincide con el intento de pago');
      }
    }

    return this.finalizePayphoneAfterConfirmJson(
      tenantId,
      transaction,
      input.id,
      payload,
      JSON.stringify(payload),
    );
  }

  private async finalizePayphoneAfterConfirmJson(
    tenantId: string,
    transaction: PayphoneTransactionEntity,
    payphoneTransactionId: string,
    confirmResponse: Record<string, unknown>,
    payphoneConfirmRaw: string | null,
  ): Promise<{
    status: 'pending' | 'approved' | 'cancelled' | 'failed';
    appointmentId?: string | null;
    clientTransactionId: string;
    transaction: Record<string, unknown> | null;
    payphoneConfirmRaw?: string | null;
  }> {
    const rawPayload = transaction.bookingPayload as Record<string, unknown>;

    transaction.payphoneTransactionId = payphoneTransactionId;
    transaction.confirmResponse = confirmResponse;

    const statusCode = Number(confirmResponse.statusCode ?? 0);
    const transactionStatus = String(confirmResponse.transactionStatus ?? '').toLowerCase();
    const approved = statusCode === 3 || transactionStatus === 'approved';
    const cancelled = statusCode === 2 || transactionStatus === 'canceled' || transactionStatus === 'cancelled';

    if (!approved) {
      transaction.status = cancelled ? 'cancelled' : 'failed';
      transaction.errorMessage =
        typeof confirmResponse.message === 'string' ? confirmResponse.message : 'Payphone no aprobó la transacción';
      await this.payphoneTransactionsRepository.save(transaction);
      return {
        status: transaction.status,
        clientTransactionId: transaction.clientTransactionId,
        transaction: transaction.confirmResponse,
        payphoneConfirmRaw,
      };
    }

    if (rawPayload.isPayphoneTest === true) {
      transaction.status = 'approved';
      transaction.confirmedAt = new Date();
      transaction.errorMessage = null;
      await this.payphoneTransactionsRepository.save(transaction);
      return {
        status: transaction.status,
        appointmentId: null,
        clientTransactionId: transaction.clientTransactionId,
        transaction: transaction.confirmResponse,
        payphoneConfirmRaw,
      };
    }

    const bookingPayload = transaction.bookingPayload as {
      serviceId: string;
      staffId?: string | null;
      startDateTime: string;
      customer: {
        fullName: string;
        email: string;
        phone: string;
        notes?: string | null;
      };
      notes?: string | null;
    };

    const appointment = await this.appointmentsService.createAdminAppointment(tenantId, {
      serviceId: bookingPayload.serviceId,
      staffId: bookingPayload.staffId ?? undefined,
      startDateTime: bookingPayload.startDateTime,
      paymentMethod: 'payphone',
      customer: {
        fullName: bookingPayload.customer.fullName,
        email: bookingPayload.customer.email,
        phone: bookingPayload.customer.phone,
        notes: bookingPayload.customer.notes ?? undefined,
      },
      notes: bookingPayload.notes ?? undefined,
      status: 'confirmed',
    });

    transaction.status = 'approved';
    transaction.appointmentId = appointment.id;
    transaction.confirmedAt = new Date();
    transaction.errorMessage = null;
    await this.payphoneTransactionsRepository.save(transaction);

    return {
      status: transaction.status,
      appointmentId: appointment.id,
      clientTransactionId: transaction.clientTransactionId,
      transaction: transaction.confirmResponse,
      payphoneConfirmRaw,
    };
  }

  private async requestPayphonePrepare(
    payload: {
      token: string;
      storeId: string;
      amount: number;
      clientTransactionId: string;
      currency: string;
      responseUrl: string;
      cancellationUrl?: string;
      reference: string;
      serviceId: string;
      serviceName: string;
      customer: { fullName: string; email: string; phone: string };
    },
    logMeta: {
      payphoneMode: string | null | undefined;
      token: string;
      storeId: string;
    },
  ) {
    if (!payload.token || !payload.storeId) {
      this.logger.warn({
        event: 'payphone.prepare.invalid_config',
        reason: !payload.token ? 'missing_token' : 'missing_store_id',
        ...this.payphoneLogContext({
          ...logMeta,
          api: 'Button/Prepare',
        }),
      });
      throw new BadRequestException('Payphone token/storeId no están configurados');
    }

    const storeIdValue = this.normalizePayphoneStoreId(String(payload.storeId));

    const body = this.buildPayphoneButtonPrepareBody({
      amount: payload.amount,
      clientTransactionId: payload.clientTransactionId,
      reference: payload.reference,
      storeId: storeIdValue,
      currency: payload.currency,
      responseUrl: payload.responseUrl,
      cancellationUrl: payload.cancellationUrl,
      serviceId: payload.serviceId,
      serviceName: payload.serviceName,
      customer: payload.customer,
    });

    const prepareBodyJson = JSON.stringify(body);

    const response = await fetch('https://pay.payphonetodoesposible.com/api/button/Prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${payload.token}`,
      },
      body: prepareBodyJson,
    });

    const raw = await response.text();
    let errorPayload: unknown = {};
    try {
      if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
        errorPayload = JSON.parse(raw) as unknown;
      }
    } catch {
      errorPayload = {};
    }

    if (!response.ok) {
      this.logger.warn({
        event: 'payphone.prepare.failed',
        httpStatus: response.status,
        prepareRequestBody: prepareBodyJson,
        bodyPreview: raw.slice(0, 800),
        ...this.payphoneLogContext({
          ...logMeta,
          api: 'Button/Prepare',
        }),
      });
      this.throwPayphoneHttpError('prepare', response.status, errorPayload, raw);
    }

    const data = this.parsePayphoneSuccessBody(raw, 'Prepare');
    return { data, raw };
  }

  /**
   * Confirmación según doc oficial (cajita / botón): POST `.../api/button/V2/Confirm`
   * con cuerpo **solo** `{ id, clientTxId }` (el `clientTransactionId` de la URL de retorno va en `clientTxId`).
   * @see https://docs.payphone.app/cajita-de-pagos-payphone#sect4
   */
  private async requestPayphoneConfirm(
    payload: { token: string; id: string; clientTxId: string },
    logMeta: {
      payphoneMode: string | null | undefined;
      token: string;
      storeId: string;
    },
  ) {
    if (!payload.token) {
      this.logger.warn({
        event: 'payphone.confirm.invalid_config',
        reason: 'missing_token',
        ...this.payphoneLogContext({
          ...logMeta,
          api: 'Button/V2/Confirm',
        }),
      });
      throw new BadRequestException('Payphone token no está configurado');
    }

    const response = await fetch('https://pay.payphonetodoesposible.com/api/button/V2/Confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${payload.token}`,
      },
      body: JSON.stringify({
        id: payload.id,
        clientTxId: payload.clientTxId,
      }),
    });

    const raw = await response.text();
    let errorPayload: unknown = {};
    try {
      if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
        errorPayload = JSON.parse(raw) as unknown;
      }
    } catch {
      errorPayload = {};
    }

    if (!response.ok) {
      this.logger.warn({
        event: 'payphone.confirm.failed',
        httpStatus: response.status,
        bodyPreview: raw.slice(0, 800),
        payphoneTransactionId: payload.id,
        clientTxId: payload.clientTxId,
        ...this.payphoneLogContext({
          ...logMeta,
          api: 'Button/V2/Confirm',
        }),
      });
      this.throwPayphoneHttpError('confirm', response.status, errorPayload, raw);
    }

    const data = this.parsePayphoneSuccessBody(raw, 'Confirm');
    return { data, raw };
  }
}
