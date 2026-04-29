import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env.APP_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  adminUrl: process.env.PUBLIC_ADMIN_URL ?? process.env.ADMIN_URL ?? 'http://localhost:5173',
  publicUrl: process.env.PUBLIC_SITE_URL ?? process.env.PUBLIC_URL ?? 'http://localhost:5174',
  whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
  whatsappGraphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v22.0',
  whatsappReminderTemplateNameEs: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME_ES ?? 'recordatorio_cita',
  whatsappReminderTemplateNameEn: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME_EN ?? 'recordatorio_cita_en',
  whatsappReminderLanguageCodeEs: process.env.WHATSAPP_REMINDER_LANGUAGE_CODE_ES ?? 'es_EC',
  whatsappReminderLanguageCodeEn: process.env.WHATSAPP_REMINDER_LANGUAGE_CODE_EN ?? 'en_US',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? 'false') === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? 'Quickly Sites',
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER ?? 'r2',
    region: process.env.R2_REGION ?? process.env.S3_REGION ?? 'auto',
    bucket: process.env.R2_BUCKET ?? process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY ?? '',
    endpoint: process.env.R2_ENDPOINT ??
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : process.env.S3_ENDPOINT ?? ''),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? process.env.S3_PUBLIC_BASE_URL ?? '',
    presignTtlSeconds: Number(process.env.R2_PRESIGN_TTL_SECONDS ?? process.env.S3_PRESIGN_TTL_SECONDS ?? 900),
    forcePathStyle: String(process.env.R2_FORCE_PATH_STYLE ?? 'false') === 'true',
  },
}));
