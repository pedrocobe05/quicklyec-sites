import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsISO8601, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

class AppointmentCustomerDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePublicAppointmentDto {
  @ApiProperty()
  @IsString()
  serviceId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiProperty()
  @IsISO8601()
  startDateTime!: string;

  @ApiPropertyOptional({ enum: ['cash', 'transfer', 'payphone'] })
  @IsOptional()
  @IsString()
  @IsIn(['cash', 'transfer', 'payphone'])
  paymentMethod?: 'cash' | 'transfer' | 'payphone';

  @ApiProperty({ type: AppointmentCustomerDto })
  @ValidateNested()
  @Type(() => AppointmentCustomerDto)
  customer!: AppointmentCustomerDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
