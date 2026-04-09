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
    const adminUrl = this.configService.get<string>('app.adminUrl') ?? 'http://localhost:5173';
    const subject = `Bienvenido a ${input.tenantName ?? 'Quickly Sites'}`;

    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject,
      text: `Hola ${input.recipientName ?? ''}\n\nTu usuario fue creado correctamente.\nAcceso: ${adminUrl}\nCorreo: ${input.to}\nContraseña temporal: ${input.temporaryPassword}\n\nCambia tu contraseña al ingresar.`,
      html: this.renderEmailTemplate({
        theme,
        title: 'Bienvenido a tu panel',
        intro: `Hola ${input.recipientName ?? ''}, tu acceso ya está listo.`,
        body: `
          <p style="margin:0 0 10px 0;"><strong>Empresa:</strong> ${input.tenantName ?? 'Quickly Sites'}</p>
          <p style="margin:0 0 10px 0;"><strong>Acceso:</strong> <a href="${adminUrl}" style="color:${theme.accentColor};">${adminUrl}</a></p>
          <p style="margin:0 0 10px 0;"><strong>Correo:</strong> ${input.to}</p>
          <p style="margin:0;"><strong>Contraseña temporal:</strong> ${input.temporaryPassword}</p>
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

    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: 'Restablecimiento de contraseña',
      text: `Hola ${input.recipientName ?? ''}\n\nTu contraseña fue restablecida.\nNueva contraseña temporal: ${input.temporaryPassword}\n\nIngresa y cámbiala cuanto antes.`,
      html: this.renderEmailTemplate({
        theme,
        title: 'Restablece tu acceso',
        intro: `Hola ${input.recipientName ?? ''}, generamos una nueva contraseña temporal para tu usuario.`,
        body: `<p style="margin:0;"><strong>Nueva contraseña temporal:</strong> ${input.temporaryPassword}</p>`,
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
    startDateTime: string;
    staffName?: string | null;
    contactPhone?: string | null;
    contactAddress?: string | null;
    staffPhotoUrl?: string | null;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: 'Recordatorio de cita',
      text:
        `Hola ${input.recipientName ?? ''}\n\n` +
        `Te recordamos tu cita para ${input.serviceName} el ${input.startDateTime}.` +
        `${input.staffName ? ` Profesional asignado: ${input.staffName}.` : ''}` +
        `${input.contactPhone ? ` Teléfono de contacto: ${input.contactPhone}.` : ''}` +
        `${input.contactAddress ? ` Dirección: ${input.contactAddress}.` : ''}`,
      html: this.renderEmailTemplate({
        theme,
        title: 'Recordatorio de cita',
        intro: `Hola ${input.recipientName ?? ''}, te recordamos tu próxima cita.`,
        body: `
          ${input.staffPhotoUrl ? `<p style="margin:0 0 16px 0;"><img src="${input.staffPhotoUrl}" alt="${input.staffName ?? 'Profesional asignado'}" style="width:84px;height:84px;border-radius:18px;object-fit:cover;border:1px solid rgba(15,23,42,0.08);" /></p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>Servicio:</strong> ${input.serviceName}</p>
          ${input.staffName ? `<p style="margin:0 0 10px 0;"><strong>Profesional:</strong> ${input.staffName}</p>` : ''}
          <p style="margin:0;"><strong>Fecha:</strong> ${input.startDateTime}</p>
          ${input.contactPhone ? `<p style="margin:10px 0 0 0;"><strong>Teléfono:</strong> ${input.contactPhone}</p>` : ''}
          ${input.contactAddress ? `<p style="margin:10px 0 0 0;"><strong>Dirección:</strong> ${input.contactAddress}</p>` : ''}
        `,
      }),
    });
  }

  async sendAppointmentConfirmationEmail(input: {
    to: string;
    tenantId: string;
    recipientName?: string | null;
    serviceName: string;
    startDateTime: string;
    staffName?: string | null;
    statusLabel?: string;
    contactPhone?: string | null;
    contactAddress?: string | null;
    staffPhotoUrl?: string | null;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    const statusLabel = input.statusLabel ?? 'Pendiente de gestión';

    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: 'Gracias por tu reserva',
      text:
        `Hola ${input.recipientName ?? ''}\n\n` +
        `Tu reserva fue registrada correctamente.\n` +
        `Servicio: ${input.serviceName}\n` +
        `${input.staffName ? `Profesional: ${input.staffName}\n` : ''}` +
        `Fecha: ${input.startDateTime}\n` +
        `Estado: ${statusLabel}\n` +
        `${input.contactPhone ? `Teléfono: ${input.contactPhone}\n` : ''}` +
        `${input.contactAddress ? `Dirección: ${input.contactAddress}\n` : ''}\n` +
        `Si necesitas cambiarla, contáctanos directamente.`,
      html: this.renderEmailTemplate({
        theme,
        title: 'Gracias por tu reserva',
        intro: `Hola ${input.recipientName ?? ''}, tu reserva fue registrada correctamente.`,
        body: `
          <p style="margin:0 0 10px 0;">Hemos recibido tu solicitud y la dejamos registrada en agenda.</p>
          ${input.staffPhotoUrl ? `<p style="margin:0 0 16px 0;"><img src="${input.staffPhotoUrl}" alt="${input.staffName ?? 'Profesional asignado'}" style="width:84px;height:84px;border-radius:18px;object-fit:cover;border:1px solid rgba(15,23,42,0.08);" /></p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>Servicio:</strong> ${input.serviceName}</p>
          ${input.staffName ? `<p style="margin:0 0 10px 0;"><strong>Profesional:</strong> ${input.staffName}</p>` : ''}
          <p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ${input.startDateTime}</p>
          <p style="margin:0 0 10px 0;"><strong>Estado:</strong> ${statusLabel}</p>
          ${input.contactPhone ? `<p style="margin:0 0 10px 0;"><strong>Teléfono:</strong> ${input.contactPhone}</p>` : ''}
          ${input.contactAddress ? `<p style="margin:0 0 10px 0;"><strong>Dirección:</strong> ${input.contactAddress}</p>` : ''}
          <p style="margin:0;">Si necesitas reprogramarla o tienes dudas, puedes responder este correo o comunicarte con el negocio.</p>
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
    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: 'Prueba de correo',
      text: `Esta es una prueba de configuración SMTP para ${theme.tenantName}. Si recibiste este mensaje, el envío funciona correctamente.`,
      html: this.renderEmailTemplate({
        theme,
        title: 'Prueba de correo',
        intro: 'Esta es una prueba de la configuración SMTP del tenant.',
        body: `
          <p style="margin:0 0 10px 0;"><strong>Tenant:</strong> ${theme.tenantName}</p>
          <p style="margin:0;">Si recibiste este correo, el envío está funcionando correctamente.</p>
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
