import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTenantBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  faviconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  secondaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fontFamily?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(24)
  borderRadius?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(24)
  buttonStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customCss?: string;
}
