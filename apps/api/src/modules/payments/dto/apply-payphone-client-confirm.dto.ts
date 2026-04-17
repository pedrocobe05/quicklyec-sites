import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsString, Min } from 'class-validator';

/** Respuesta JSON de `V2/Confirm` obtenida en el navegador (doc Payphone). */
export class ApplyPayphoneClientConfirmDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty()
  @IsString()
  clientTxId!: string;

  @ApiProperty({ description: 'Cuerpo JSON devuelto por Payphone al confirmar en el cliente' })
  @IsObject()
  confirmPayload!: Record<string, unknown>;
}
