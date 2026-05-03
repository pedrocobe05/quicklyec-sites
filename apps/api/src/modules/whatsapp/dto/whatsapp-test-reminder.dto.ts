import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WhatsappTestReminderDto {
  @ApiProperty({ example: '593991234567', description: 'E.164 sin + (solo dígitos, código país + número).' })
  @IsString()
  @IsNotEmpty()
  to!: string;
}
