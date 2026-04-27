import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMyProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  fullName!: string;
}
