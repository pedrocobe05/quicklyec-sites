import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SITE_SECTION_TYPES, type SiteSectionScope } from '@quickly-sites/shared';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateSectionDto {
  @ApiProperty()
  @IsString()
  tenantId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['global', 'page'])
  scope?: SiteSectionScope;

  @ApiProperty()
  @IsIn(SITE_SECTION_TYPES)
  type!: string;

  @ApiProperty()
  @IsString()
  variant!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  position!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
