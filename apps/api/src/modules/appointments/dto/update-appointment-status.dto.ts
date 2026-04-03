import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @ApiProperty()
  @IsString()
  tenantId!: string;

  @ApiProperty({
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
  })
  @IsIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
  status!: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
}
