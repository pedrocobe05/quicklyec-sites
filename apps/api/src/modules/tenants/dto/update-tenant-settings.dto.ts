import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicSiteEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bookingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['es', 'en'])
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cashPaymentEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  transferPaymentEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  payphonePaymentEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['redirect', 'box'] })
  @IsOptional()
  @IsString()
  @IsIn(['redirect', 'box'])
  payphoneMode?: 'redirect' | 'box';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  payphoneStoreId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  payphoneToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsappNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  siteIndexingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  defaultSeoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  defaultSeoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultOgImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  canonicalDomain?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  mailConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Activar envío de recordatorio de cita por WhatsApp Cloud API' })
  @IsOptional()
  @IsBoolean()
  whatsappReminderEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Máximo de mensajes de recordatorio WhatsApp por mes civil (UTC). Ampliable por negocio si tienen paquete extra.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  whatsappReminderMonthlyQuota?: number;
}
