import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}


export class PayphoneTestPrepareDto {
  @ApiProperty({ description: 'URL de retorno del sitio público (ej. https://tudominio.com/payphone/return)' })
  @IsUrl({ require_tld: false })
  responseUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  cancellationUrl?: string;

  @ApiPropertyOptional({ description: 'Monto en centavos (por defecto 100 = 1.00 USD)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  amountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  customerFullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) {
      return undefined;
    }
    if (typeof value !== 'string') {
      return value;
    }
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  customerPhone?: string;

  /** Credenciales actuales del formulario (opcional); si no se envían, se usan las guardadas en el tenant. */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  payphoneToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  payphoneStoreId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['redirect', 'box'])
  payphoneMode?: 'redirect' | 'box';
}
