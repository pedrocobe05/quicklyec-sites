import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateTenantPlanDto {
  @ApiProperty()
  @IsString()
  plan!: string;
}
