import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WhatsappTestTemplateDto {
  @ApiProperty({ example: '593991234567', description: 'E.164 sin + (solo dígitos, código país + número).' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ example: 'hello_world', description: 'Nombre exacto de la plantilla en Meta (minúsculas).' })
  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @ApiPropertyOptional({ example: 'en_US', description: 'Código de idioma de la plantilla en Meta.' })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiPropertyOptional({ type: [String], description: 'Valores {{1}}, {{2}}, … del cuerpo de la plantilla.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bodyParams?: string[];
}
