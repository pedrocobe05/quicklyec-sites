import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettingEntity, TenantBrandingEntity, TenantEntity, TenantSettingEntity } from 'src/common/entities';

type ResolvedMailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
};

type MailTheme = {
  tenantName: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  fromName: string;
  fromEmail: string;
};

type MailLocale = 'es' | 'en';

function normalizeMailLocale(value?: string | null): MailLocale {
  const normalized = String(value ?? '').toLowerCase().trim();
  if (normalized.startsWith('en')) {
    return 'en';
  }
  return 'es';
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(TenantSettingEntity)
    private readonly tenantSettingsRepository: Repository<TenantSettingEntity>,
    @InjectRepository(TenantBrandingEntity)
    private readonly brandingRepository: Repository<TenantBrandingEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
    @InjectRepository(PlatformSettingEntity)
    private readonly platformSettingsRepository: Repository<PlatformSettingEntity>,
  ) {}

  private async resolveTenantLocale(tenantId: string): Promise<MailLocale> {
    const settings = await this.tenantSettingsRepository.findOne({ where: { tenantId } });
    return normalizeMailLocale(settings?.locale);
  }

  private formatDateTime(value: Date | string, locale: MailLocale) {
    return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private formatDate(value: string, locale: MailLocale) {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  async sendWelcomeEmail(input: {
    to: string;
    tenantId: string;
    recipientName?: string | null;
    tenantName?: string | null;
    temporaryPassword: string;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    const locale = await this.resolveTenantLocale(input.tenantId);
    const adminUrl = this.configService.get<string>('app.adminUrl') ?? 'http://localhost:5173';
    const subject = locale === 'en'
      ? `Welcome to ${input.tenantName ?? 'Quickly Sites'}`
      : `Bienvenido a ${input.tenantName ?? 'Quickly Sites'}`;
    const greeting = locale === 'en' ? 'Hello' : 'Hola';
    const accessLabel = locale === 'en' ? 'Access' : 'Acceso';
    const emailLabel = locale === 'en' ? 'Email' : 'Correo';
    const tempPasswordLabel = locale === 'en' ? 'Temporary password' : 'Contraseña temporal';
    const changePasswordNote = locale === 'en'
      ? 'Please change your password after logging in.'
      : 'Cambia tu contraseña al ingresar.';

    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject,
      text: `${greeting} ${input.recipientName ?? ''}\n\n${
        locale === 'en'
          ? 'Your user account was created successfully.'
          : 'Tu usuario fue creado correctamente.'
      }\n${accessLabel}: ${adminUrl}\n${emailLabel}: ${input.to}\n${tempPasswordLabel}: ${input.temporaryPassword}\n\n${changePasswordNote}`,
      html: this.renderEmailTemplate({
        theme,
        title: locale === 'en' ? 'Welcome to your dashboard' : 'Bienvenido a tu panel',
        intro: `${greeting} ${input.recipientName ?? ''}, ${locale === 'en' ? 'your access is ready.' : 'tu acceso ya está listo.'}`,
        body: `
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Company' : 'Empresa'}:</strong> ${input.tenantName ?? 'Quickly Sites'}</p>
          <p style="margin:0 0 10px 0;"><strong>${accessLabel}:</strong> <a href="${adminUrl}" style="color:${theme.accentColor};">${adminUrl}</a></p>
          <p style="margin:0 0 10px 0;"><strong>${emailLabel}:</strong> ${input.to}</p>
          <p style="margin:0;"><strong>${tempPasswordLabel}:</strong> ${input.temporaryPassword}</p>
          <p style="margin:12px 0 0 0;">${changePasswordNote}</p>
        `,
      }),
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    tenantId: string;
    recipientName?: string | null;
    temporaryPassword: string;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    const locale = await this.resolveTenantLocale(input.tenantId);

    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: locale === 'en' ? 'Password reset' : 'Restablecimiento de contraseña',
      text:
        `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}\n\n` +
        `${locale === 'en' ? 'Your password was reset.' : 'Tu contraseña fue restablecida.'}\n` +
        `${locale === 'en' ? 'Temporary password' : 'Nueva contraseña temporal'}: ${input.temporaryPassword}\n\n` +
        `${locale === 'en' ? 'Please sign in and change it as soon as possible.' : 'Ingresa y cámbiala cuanto antes.'}`,
      html: this.renderEmailTemplate({
        theme,
        title: locale === 'en' ? 'Reset your access' : 'Restablece tu acceso',
        intro: `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}, ${locale === 'en' ? 'we generated a new temporary password for your account.' : 'generamos una nueva contraseña temporal para tu usuario.'}`,
        body: `<p style="margin:0;"><strong>${locale === 'en' ? 'Temporary password' : 'Nueva contraseña temporal'}:</strong> ${input.temporaryPassword}</p>`,
      }),
    });
  }

  async sendAdminPasswordRecoveryEmail(input: {
    to: string;
    recipientName?: string | null;
    resetUrl: string;
    expiresInMinutes: number;
  }) {
    const transporter = await this.createFallbackTransporter();
    if (!transporter) return;

    const theme = await this.resolvePlatformTheme();

    await transporter.sendMail({
      from: `"Soporte QuicklyEC" <${theme.fromEmail}>`,
      to: input.to,
      subject: 'Recupera el acceso a tu cuenta',
      text:
        `Hola ${input.recipientName ?? ''}\n\n` +
        `Recibimos una solicitud para restablecer tu contraseña.\n` +
        `Usa este enlace para crear una nueva contraseña:\n${input.resetUrl}\n\n` +
        `Este enlace expira en ${input.expiresInMinutes} minutos.\n` +
        `Si no solicitaste este cambio, puedes ignorar este correo.\n\n` +
        `Soporte QuicklyEC`,
      html: this.renderEmailTemplate({
        theme: {
          ...theme,
          fromName: 'Soporte QuicklyEC',
        },
        title: 'Recupera el acceso a tu cuenta',
        intro: `Hola ${input.recipientName ?? ''}, recibimos una solicitud para restablecer tu contraseña.`,
        body: `
          <p style="margin:0 0 14px 0;">Haz clic en el siguiente botón para definir una nueva contraseña de forma segura.</p>
          <p style="margin:0 0 18px 0;">
            <a href="${input.resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:${theme.accentColor};color:#fff;text-decoration:none;font-weight:600;">
              Restablecer contraseña
            </a>
          </p>
          <p style="margin:0 0 12px 0;"><strong>Enlace directo:</strong><br /><a href="${input.resetUrl}" style="color:${theme.accentColor};word-break:break-all;">${input.resetUrl}</a></p>
          <p style="margin:0 0 12px 0;"><strong>Vigencia:</strong> ${input.expiresInMinutes} minutos</p>
          <p style="margin:0;">Si no solicitaste este cambio, puedes ignorar este correo con tranquilidad.</p>
        `,
      }),
    });
  }

  async sendAppointmentReminderEmail(input: {
    to: string;
    tenantId: string;
    recipientName?: string | null;
    serviceName: string;
    startDateTime: Date | string;
    staffName?: string | null;
    statusLabel?: string;
    contactPhone?: string | null;
    contactAddress?: string | null;
    staffPhotoUrl?: string | null;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    const locale = await this.resolveTenantLocale(input.tenantId);
    const statusLabel = input.statusLabel ?? (locale === 'en' ? 'Pending management' : 'Pendiente de gestión');
    const dateTime = this.formatDateTime(input.startDateTime, locale);
    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: locale === 'en' ? 'Appointment reminder' : 'Recordatorio de cita',
      text:
        `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}\n\n` +
        `${locale === 'en' ? 'This is a reminder for your upcoming appointment.' : 'Te recordamos tu próxima cita.'}\n` +
        `${locale === 'en' ? 'Service' : 'Servicio'}: ${input.serviceName}\n` +
        `${input.staffName ? `${locale === 'en' ? 'Professional' : 'Profesional'}: ${input.staffName}\n` : ''}` +
        `${locale === 'en' ? 'Date' : 'Fecha'}: ${dateTime}\n` +
        `${locale === 'en' ? 'Status' : 'Estado'}: ${statusLabel}\n` +
        `${input.contactPhone ? `${locale === 'en' ? 'Phone' : 'Teléfono'}: ${input.contactPhone}\n` : ''}` +
        `${input.contactAddress ? `${locale === 'en' ? 'Address' : 'Dirección'}: ${input.contactAddress}\n` : ''}\n` +
        `${locale === 'en' ? 'If you need to reschedule or have questions, contact us directly.' : 'Si necesitas reprogramarla o tienes dudas, contáctanos directamente.'}`,
      html: this.renderEmailTemplate({
        theme,
        title: locale === 'en' ? 'Appointment reminder' : 'Recordatorio de cita',
        intro: `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}, ${locale === 'en' ? 'this is a reminder for your upcoming appointment.' : 'te recordamos tu próxima cita.'}`,
        body: `
          <p style="margin:0 0 10px 0;">${locale === 'en' ? 'We want to make sure you have the essential details of your booking handy.' : 'Queremos asegurarnos de que tengas a mano los datos esenciales de tu reserva.'}</p>
          ${input.staffPhotoUrl ? `<p style="margin:0 0 16px 0;"><img src="${input.staffPhotoUrl}" alt="${input.staffName ?? 'Profesional asignado'}" style="width:84px;height:84px;border-radius:18px;object-fit:cover;border:1px solid rgba(15,23,42,0.08);" /></p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Service' : 'Servicio'}:</strong> ${input.serviceName}</p>
          ${input.staffName ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Professional' : 'Profesional'}:</strong> ${input.staffName}</p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Date' : 'Fecha'}:</strong> ${dateTime}</p>
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Status' : 'Estado'}:</strong> ${statusLabel}</p>
          ${input.contactPhone ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Phone' : 'Teléfono'}:</strong> ${input.contactPhone}</p>` : ''}
          ${input.contactAddress ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Address' : 'Dirección'}:</strong> ${input.contactAddress}</p>` : ''}
          <p style="margin:0;">${locale === 'en' ? 'If you need to reschedule or have questions, reply to this email or contact the business.' : 'Si necesitas reprogramarla o tienes dudas, puedes responder este correo o comunicarte con el negocio.'}</p>
        `,
      }),
    });
  }

  async sendTenantSubscriptionAlertEmail(input: {
    to: string;
    tenantId: string;
    recipientName?: string | null;
    tenantName: string;
    subscriptionStartsAt?: string | null;
    subscriptionEndsAt: string;
    daysRemaining?: number | null;
    expired: boolean;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    const locale = await this.resolveTenantLocale(input.tenantId);
    const adminUrl = this.configService.get<string>('app.adminUrl') ?? 'http://localhost:5173';
    const formattedStartDate = input.subscriptionStartsAt
      ? this.formatDate(input.subscriptionStartsAt, locale)
      : null;
    const formattedEndDate = this.formatDate(input.subscriptionEndsAt, locale);
    const subject = input.expired
      ? (locale === 'en'
        ? `${input.tenantName} subscription expired`
        : `La suscripción de ${input.tenantName} ha caducado`)
      : (locale === 'en'
        ? `${input.tenantName} subscription expires soon`
        : `La suscripción de ${input.tenantName} está por caducar`);
    const intro = input.expired
      ? (locale === 'en'
        ? `Hello ${input.recipientName ?? ''}, the subscription for ${input.tenantName} expired and the public site is now disabled.`
        : `Hola ${input.recipientName ?? ''}, la suscripción de ${input.tenantName} ha caducado y el sitio público quedó deshabilitado.`)
      : (locale === 'en'
        ? `Hello ${input.recipientName ?? ''}, the subscription for ${input.tenantName} will expire in ${input.daysRemaining} day(s).`
        : `Hola ${input.recipientName ?? ''}, la suscripción de ${input.tenantName} caduca en ${input.daysRemaining} día(s).`);

    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject,
      text: [
        intro,
        '',
        `${locale === 'en' ? 'Tenant' : 'Tenant'}: ${input.tenantName}`,
        formattedStartDate ? `${locale === 'en' ? 'Start date' : 'Fecha de inicio'}: ${formattedStartDate}` : null,
        `${locale === 'en' ? 'End date' : 'Fecha de fin'}: ${formattedEndDate}`,
        input.expired
          ? (locale === 'en'
            ? 'The public site stays disabled until the subscription window is updated.'
            : 'El sitio público permanecerá deshabilitado hasta que actualices el período de suscripción.')
          : (locale === 'en'
            ? 'Review the tenant and renew the subscription before the end date to avoid service interruption.'
            : 'Revisa el tenant y renueva la suscripción antes de la fecha final para evitar interrupciones del servicio.'),
        `${locale === 'en' ? 'Admin panel' : 'Panel admin'}: ${adminUrl}`,
      ].filter(Boolean).join('\n'),
      html: this.renderEmailTemplate({
        theme,
        title: input.expired
          ? (locale === 'en' ? 'Subscription expired' : 'Suscripción caducada')
          : (locale === 'en' ? 'Subscription expiring soon' : 'Suscripción próxima a caducar'),
        intro,
        body: `
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Tenant' : 'Tenant'}:</strong> ${input.tenantName}</p>
          ${formattedStartDate ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Start date' : 'Fecha de inicio'}:</strong> ${formattedStartDate}</p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'End date' : 'Fecha de fin'}:</strong> ${formattedEndDate}</p>
          ${!input.expired && typeof input.daysRemaining === 'number' ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Days remaining' : 'Días restantes'}:</strong> ${input.daysRemaining}</p>` : ''}
          <p style="margin:0 0 14px 0;">
            ${
              input.expired
                ? (locale === 'en'
                  ? 'The public site has been disabled automatically until the subscription period is updated.'
                  : 'El sitio público se deshabilitó automáticamente hasta que el período de suscripción sea actualizado.')
                : (locale === 'en'
                  ? 'Renew or extend the subscription period before the end date to avoid service interruption.'
                  : 'Renueva o extiende el período de suscripción antes de la fecha final para evitar interrupciones del servicio.')
            }
          </p>
          <p style="margin:0;">
            <a href="${adminUrl}" style="color:${theme.accentColor};text-decoration:underline;">
              ${locale === 'en' ? 'Open admin panel' : 'Abrir panel admin'}
            </a>
          </p>
        `,
      }),
    });
  }

  async sendAppointmentConfirmationEmail(input: {
    to: string;
    tenantId: string;
    recipientName?: string | null;
    serviceName: string;
    startDateTime: Date | string;
    staffName?: string | null;
    statusLabel?: string;
    contactPhone?: string | null;
    contactAddress?: string | null;
    staffPhotoUrl?: string | null;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    const locale = await this.resolveTenantLocale(input.tenantId);
    const statusLabel = input.statusLabel ?? (locale === 'en' ? 'Pending management' : 'Pendiente de gestión');
    const dateTime = this.formatDateTime(input.startDateTime, locale);

    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: locale === 'en' ? 'Thanks for your booking' : 'Gracias por tu reserva',
      text:
        `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}\n\n` +
        `${locale === 'en' ? 'Your booking was registered successfully.' : 'Tu reserva fue registrada correctamente.'}\n` +
        `${locale === 'en' ? 'Service' : 'Servicio'}: ${input.serviceName}\n` +
        `${input.staffName ? `${locale === 'en' ? 'Professional' : 'Profesional'}: ${input.staffName}\n` : ''}` +
        `${locale === 'en' ? 'Date' : 'Fecha'}: ${dateTime}\n` +
        `${locale === 'en' ? 'Status' : 'Estado'}: ${statusLabel}\n` +
        `${input.contactPhone ? `${locale === 'en' ? 'Phone' : 'Teléfono'}: ${input.contactPhone}\n` : ''}` +
        `${input.contactAddress ? `${locale === 'en' ? 'Address' : 'Dirección'}: ${input.contactAddress}\n` : ''}\n` +
        `${locale === 'en' ? 'If you need to change it, contact us directly.' : 'Si necesitas cambiarla, contáctanos directamente.'}`,
      html: this.renderEmailTemplate({
        theme,
        title: locale === 'en' ? 'Thanks for your booking' : 'Gracias por tu reserva',
        intro: `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}, ${locale === 'en' ? 'your booking was registered successfully.' : 'tu reserva fue registrada correctamente.'}`,
        body: `
          <p style="margin:0 0 10px 0;">${locale === 'en' ? 'We received your request and added it to the schedule.' : 'Hemos recibido tu solicitud y la dejamos registrada en agenda.'}</p>
          ${input.staffPhotoUrl ? `<p style="margin:0 0 16px 0;"><img src="${input.staffPhotoUrl}" alt="${input.staffName ?? 'Profesional asignado'}" style="width:84px;height:84px;border-radius:18px;object-fit:cover;border:1px solid rgba(15,23,42,0.08);" /></p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Service' : 'Servicio'}:</strong> ${input.serviceName}</p>
          ${input.staffName ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Professional' : 'Profesional'}:</strong> ${input.staffName}</p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Date' : 'Fecha'}:</strong> ${dateTime}</p>
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Status' : 'Estado'}:</strong> ${statusLabel}</p>
          ${input.contactPhone ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Phone' : 'Teléfono'}:</strong> ${input.contactPhone}</p>` : ''}
          ${input.contactAddress ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Address' : 'Dirección'}:</strong> ${input.contactAddress}</p>` : ''}
          <p style="margin:0;">${locale === 'en' ? 'If you need to reschedule or have questions, reply to this email or contact the business.' : 'Si necesitas reprogramarla o tienes dudas, puedes responder este correo o comunicarte con el negocio.'}</p>
        `,
      }),
    });
  }

  async sendAppointmentStaffNotificationEmail(input: {
    to: string;
    tenantId: string;
    recipientName?: string | null;
    notificationKind?: 'created' | 'updated';
    customerName: string;
    customerEmail: string;
    customerPhone?: string | null;
    serviceName: string;
    startDateTime: Date | string;
    statusLabel?: string;
    contactPhone?: string | null;
    contactAddress?: string | null;
    notes?: string | null;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    const locale = await this.resolveTenantLocale(input.tenantId);
    const adminUrl = this.configService.get<string>('app.adminUrl') ?? 'http://localhost:5173';
    const statusLabel = input.statusLabel ?? (locale === 'en' ? 'New booking' : 'Nueva reserva');
    const notificationKind = input.notificationKind ?? 'created';
    const subject = notificationKind === 'updated'
      ? (locale === 'en' ? 'Booking updated' : 'Reserva actualizada')
      : (locale === 'en' ? 'New booking assigned' : 'Nueva reserva asignada');
    const title = subject;
    const intro =
      notificationKind === 'updated'
        ? `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}, ${locale === 'en' ? 'an assigned booking was updated.' : 'se actualizó una reserva asignada.'}`
        : `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}, ${locale === 'en' ? 'you have a new assigned booking.' : 'tienes una nueva reserva asignada.'}`;
    const dateTime = this.formatDateTime(input.startDateTime, locale);

    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject,
      text:
        `${locale === 'en' ? 'Hello' : 'Hola'} ${input.recipientName ?? ''}\n\n` +
        `${notificationKind === 'updated' ? (locale === 'en' ? 'An assigned booking was updated.' : 'Se actualizó una reserva asignada.') : (locale === 'en' ? 'You have a new assigned booking.' : 'Tienes una nueva reserva asignada.')}\n` +
        `${locale === 'en' ? 'Customer' : 'Cliente'}: ${input.customerName}\n` +
        `${locale === 'en' ? 'Customer email' : 'Correo del cliente'}: ${input.customerEmail}\n` +
        `${input.customerPhone ? `${locale === 'en' ? 'Customer phone' : 'Teléfono del cliente'}: ${input.customerPhone}\n` : ''}` +
        `${locale === 'en' ? 'Service' : 'Servicio'}: ${input.serviceName}\n` +
        `${locale === 'en' ? 'Date' : 'Fecha'}: ${dateTime}\n` +
        `${locale === 'en' ? 'Status' : 'Estado'}: ${statusLabel}\n` +
        `${input.contactPhone ? `${locale === 'en' ? 'Contact phone' : 'Teléfono de contacto'}: ${input.contactPhone}\n` : ''}` +
        `${input.contactAddress ? `${locale === 'en' ? 'Address' : 'Dirección'}: ${input.contactAddress}\n` : ''}` +
        `${input.notes ? `${locale === 'en' ? 'Notes' : 'Notas'}: ${input.notes}\n` : ''}\n` +
        `${locale === 'en' ? 'You can review your schedule in QuicklyEC Sites:' : 'Puedes revisar tu agenda en QuicklyEC Sites:'} ${adminUrl}\n` +
        `${locale === 'en' ? 'Review your schedule to manage this booking.' : 'Revisa la agenda para gestionar esta reserva.'}`,
      html: this.renderEmailTemplate({
        theme,
        title,
        intro,
        body: `
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Customer' : 'Cliente'}:</strong> ${input.customerName}</p>
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Customer email' : 'Correo del cliente'}:</strong> ${input.customerEmail}</p>
          ${input.customerPhone ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Customer phone' : 'Teléfono del cliente'}:</strong> ${input.customerPhone}</p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Service' : 'Servicio'}:</strong> ${input.serviceName}</p>
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Date' : 'Fecha'}:</strong> ${dateTime}</p>
          <p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Status' : 'Estado'}:</strong> ${statusLabel}</p>
          ${input.contactPhone ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Contact phone' : 'Teléfono de contacto'}:</strong> ${input.contactPhone}</p>` : ''}
          ${input.contactAddress ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Address' : 'Dirección'}:</strong> ${input.contactAddress}</p>` : ''}
          ${input.notes ? `<p style="margin:0 0 10px 0;"><strong>${locale === 'en' ? 'Notes' : 'Notas'}:</strong> ${input.notes}</p>` : ''}
          <p style="margin:0 0 10px 0;">${locale === 'en' ? 'You can review your schedule in' : 'Puedes revisar tu agenda en'} <a href="${adminUrl}" style="color:${theme.accentColor};text-decoration:underline;">QuicklyEC Sites</a>.</p>
          <p style="margin:0;">${locale === 'en' ? 'Review your schedule to manage this booking.' : 'Revisa la agenda para gestionar esta reserva.'}</p>
        `,
      }),
    });
  }

  async sendTestEmail(input: {
    to: string;
    tenantId: string;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) {
      throw new BadRequestException('No hay una configuración SMTP válida para este tenant.');
    }

    const theme = await this.resolveTheme(input.tenantId);
    const locale = await this.resolveTenantLocale(input.tenantId);
    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: locale === 'en' ? 'Email test' : 'Prueba de correo',
      text: locale === 'en'
        ? `This is an SMTP test for ${theme.tenantName}. If you received this message, sending works correctly.`
        : `Esta es una prueba de configuración SMTP para ${theme.tenantName}. Si recibiste este mensaje, el envío funciona correctamente.`,
      html: this.renderEmailTemplate({
        theme,
        title: locale === 'en' ? 'Email test' : 'Prueba de correo',
        intro: locale === 'en'
          ? 'This is a test of the tenant SMTP configuration.'
          : 'Esta es una prueba de la configuración SMTP del tenant.',
        body: `
          <p style="margin:0 0 10px 0;"><strong>Tenant:</strong> ${theme.tenantName}</p>
          <p style="margin:0;">${locale === 'en' ? 'If you received this email, sending is working correctly.' : 'Si recibiste este correo, el envío está funcionando correctamente.'}</p>
        `,
      }),
    });

    return {
      success: true,
      message: `Correo de prueba enviado a ${input.to}.`,
    };
  }

  private async createTransporter(tenantId: string) {
    const config = await this.resolveMailConfig(tenantId);
    if (!config?.host || !config.fromEmail) {
      this.logger.warn(`Correo omitido porque no hay SMTP configurado para tenant ${tenantId}`);
      return null;
    }

    const nodemailer = await import('nodemailer');
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  private async createFallbackTransporter() {
    const [platformSetting] = await Promise.all([
      this.platformSettingsRepository.findOne({ where: {}, order: { createdAt: 'ASC' } }),
    ]);
    const config = this.resolveFallbackMailConfig(platformSetting);
    if (!config?.host || !config.fromEmail) {
      this.logger.warn('Correo omitido porque no hay SMTP fallback configurado');
      return null;
    }

    const nodemailer = await import('nodemailer');
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  private async resolveMailConfig(tenantId: string): Promise<ResolvedMailConfig | null> {
    const [tenantSetting, platformSetting] = await Promise.all([
      this.tenantSettingsRepository.findOne({ where: { tenantId } }),
      this.platformSettingsRepository.findOne({ where: {}, order: { createdAt: 'ASC' } }),
    ]);

    const tenantMailConfig = (tenantSetting?.mailConfig ?? null) as Record<string, unknown> | null;
    if (tenantMailConfig?.host && tenantMailConfig?.fromEmail) {
      return {
        host: String(tenantMailConfig.host),
        port: Number(tenantMailConfig.port ?? 587),
        secure: Boolean(tenantMailConfig.secure ?? false),
        user: String(tenantMailConfig.user ?? ''),
        pass: String(tenantMailConfig.pass ?? ''),
        fromEmail: String(tenantMailConfig.fromEmail),
        fromName: String(tenantMailConfig.fromName ?? platformSetting?.defaultSenderName ?? 'Quickly Sites'),
      };
    }

    const fallbackConfig = this.resolveFallbackMailConfig(platformSetting);

    if (!fallbackConfig) {
      return null;
    }

    return fallbackConfig;
  }

  private resolveFallbackMailConfig(platformSetting?: PlatformSettingEntity | null) {
    const fallback = this.configService.get<{
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
      fromEmail: string;
      fromName: string;
    }>('app.smtp');

    if (!fallback?.host || !fallback?.fromEmail) {
      return null;
    }

    return {
      host: fallback.host,
      port: Number(fallback.port ?? 587),
      secure: Boolean(fallback.secure ?? false),
      user: fallback.user,
      pass: fallback.pass,
      fromEmail: platformSetting?.defaultSenderEmail ?? fallback.fromEmail,
      fromName: platformSetting?.defaultSenderName ?? fallback.fromName ?? 'QuicklyEC',
    };
  }

  private async resolveTheme(tenantId: string): Promise<MailTheme> {
    const [tenant, branding, platformSetting] = await Promise.all([
      this.tenantsRepository.findOne({ where: { id: tenantId } }),
      this.brandingRepository.findOne({ where: { tenantId } }),
      this.platformSettingsRepository.findOne({ where: {}, order: { createdAt: 'ASC' } }),
    ]);

    return {
      tenantName: tenant?.name ?? 'Quickly Sites',
      primaryColor: branding?.primaryColor ?? '#0f1238',
      accentColor: branding?.accentColor ?? '#d3a429',
      secondaryColor: branding?.secondaryColor ?? '#f8fafc',
      fromName: platformSetting?.defaultSenderName ?? 'Quickly Sites',
      fromEmail:
        platformSetting?.defaultSenderEmail ??
        this.configService.get<string>('app.smtp.fromEmail') ??
        'sites@quicklyec.com',
    };
  }

  private async resolvePlatformTheme(): Promise<MailTheme> {
    const platformSetting = await this.platformSettingsRepository.findOne({ where: {}, order: { createdAt: 'ASC' } });
    const fallback = this.resolveFallbackMailConfig(platformSetting);

    return {
      tenantName: platformSetting?.platformName ?? 'QuicklyEC',
      primaryColor: '#0f1238',
      accentColor: '#004091',
      secondaryColor: '#f8fafc',
      fromName: 'Soporte QuicklyEC',
      fromEmail: fallback?.fromEmail ?? platformSetting?.defaultSenderEmail ?? 'soporte@quicklyec.com',
    };
  }

  private renderEmailTemplate(input: {
    theme: MailTheme;
    title: string;
    intro: string;
    body: string;
  }) {
    return `
      <div style="margin:0 auto;max-width:680px;background:${input.theme.secondaryColor};padding:32px 20px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="background:${input.theme.primaryColor};border-radius:24px;padding:28px;color:#ffffff;box-shadow:0 18px 40px rgba(15,23,42,0.16);">
          <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:${input.theme.accentColor};">${input.theme.tenantName}</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${input.title}</h1>
          <p style="margin:14px 0 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">${input.intro}</p>
        </div>
        <div style="background:#ffffff;border-radius:24px;margin-top:18px;padding:28px;border:1px solid rgba(15,23,42,0.08);box-shadow:0 10px 28px rgba(15,23,42,0.06);">
          ${input.body}
        </div>
      </div>
    `;
  }
}
