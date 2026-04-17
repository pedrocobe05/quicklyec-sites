import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class CreateAppointmentCustomerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  fullName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  identification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAppointmentDto {
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

  @ApiPropertyOptional({ enum: ['cash', 'transfer', 'payphone'] })
  @IsOptional()
  @IsIn(['cash', 'transfer', 'payphone'])
  paymentMethod?: 'cash' | 'transfer' | 'payphone';

  @ApiPropertyOptional({
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
  })
  @IsOptional()
  @IsIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ type: CreateAppointmentCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAppointmentCustomerDto)
  customer?: CreateAppointmentCustomerDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;
}
