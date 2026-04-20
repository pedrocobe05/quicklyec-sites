import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class UpdatePlatformTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(24)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(24)
  plan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  subscriptionStartsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  subscriptionEndsAt?: string;
}
