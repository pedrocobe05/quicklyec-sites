import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

/** Respuesta JSON de `V2/Confirm` obtenida en el navegador (doc Payphone). */
export class ApplyPayphoneClientConfirmDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  clientTxId!: string;

  @ApiProperty({ description: 'Cuerpo JSON devuelto por Payphone al confirmar en el cliente' })
  @IsObject()
  confirmPayload!: Record<string, unknown>;
}
