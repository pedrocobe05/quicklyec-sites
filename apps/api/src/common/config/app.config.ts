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
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? 'false') === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? 'Quickly Sites',
  },
  s3: {
    region: process.env.S3_REGION ?? '',
    bucket: process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    endpoint: process.env.S3_ENDPOINT ?? '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',
    presignTtlSeconds: Number(process.env.S3_PRESIGN_TTL_SECONDS ?? 900),
  },
}));
