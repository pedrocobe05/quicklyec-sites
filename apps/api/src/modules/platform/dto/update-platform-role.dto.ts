import { PartialType } from '@nestjs/swagger';
import { CreatePlatformRoleDto } from './create-platform-role.dto';

export class UpdatePlatformRoleDto extends PartialType(CreatePlatformRoleDto) {}
