import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsISO8601, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

class PayphonePaymentCustomerDto {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'customer.fullName no puede estar vacío' })
  fullName!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsNotEmpty({ message: 'customer.email es obligatorio' })
  @IsEmail({}, { message: 'customer.email debe ser un correo válido' })
  email!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'customer.phone no puede estar vacío' })
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trimString)
  @IsString()
  notes?: string;
}

export class PreparePayphonePaymentDto {
  @ApiProperty()
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiProperty()
  @IsISO8601()
  startDateTime!: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => PayphonePaymentCustomerDto)
  customer!: PayphonePaymentCustomerDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsString()
  responseUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationUrl?: string;
}

