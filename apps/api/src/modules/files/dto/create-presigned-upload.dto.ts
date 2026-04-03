import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePresignedUploadDto {
  @ApiProperty({ enum: ['branding', 'site', 'gallery'] })
  @IsString()
  @IsIn(['branding', 'site', 'gallery'])
  resourceType!: 'branding' | 'site' | 'gallery';

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  filename!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  contentType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ enum: ['public', 'private'] })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
