import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

function emptyToUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateTenantMembershipDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  fullName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  password?: string;

  @ApiProperty()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsUUID()
  roleId!: string;

  /** Obligatorio si el rol es `staff`: id del profesional en esta empresa. */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsUUID()
  linkedStaffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
