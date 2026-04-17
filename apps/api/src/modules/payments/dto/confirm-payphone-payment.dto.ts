import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class ConfirmPayphonePaymentDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty()
  @IsString()
  clientTxId!: string;
}

