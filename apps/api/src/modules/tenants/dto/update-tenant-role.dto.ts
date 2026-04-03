import { PartialType } from '@nestjs/swagger';
import { CreateTenantRoleDto } from './create-tenant-role.dto';

export class UpdateTenantRoleDto extends PartialType(CreateTenantRoleDto) {}
