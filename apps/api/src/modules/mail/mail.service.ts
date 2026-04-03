import { Injectable, Logger } from '@nestjs/common';
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

  async sendAppointmentReminderEmail(input: {
    to: string;
    tenantId: string;
    recipientName?: string | null;
    serviceName: string;
    startDateTime: string;
  }) {
    const transporter = await this.createTransporter(input.tenantId);
    if (!transporter) return;

    const theme = await this.resolveTheme(input.tenantId);
    await transporter.sendMail({
      from: `"${theme.fromName}" <${theme.fromEmail}>`,
      to: input.to,
      subject: 'Recordatorio de cita',
      text: `Hola ${input.recipientName ?? ''}\n\nTe recordamos tu cita para ${input.serviceName} el ${input.startDateTime}.`,
      html: this.renderEmailTemplate({
        theme,
        title: 'Recordatorio de cita',
        intro: `Hola ${input.recipientName ?? ''}, te recordamos tu próxima cita.`,
        body: `<p style="margin:0 0 10px 0;"><strong>Servicio:</strong> ${input.serviceName}</p><p style="margin:0;"><strong>Fecha:</strong> ${input.startDateTime}</p>`,
      }),
    });
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

    return fallback;
  }

  private async resolveTheme(tenantId: string) {
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

  private renderEmailTemplate(input: {
    theme: {
      tenantName: string;
      primaryColor: string;
      accentColor: string;
      secondaryColor: string;
      fromName: string;
      fromEmail: string;
    };
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
