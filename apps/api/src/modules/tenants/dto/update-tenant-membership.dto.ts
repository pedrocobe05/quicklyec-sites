import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTenantMembershipDto } from './create-tenant-membership.dto';

/** PATCH: mismos campos que alta de usuario, sin contraseña; hereda validación (p. ej. `linkedStaffId` para rol staff). */
export class UpdateTenantMembershipDto extends PartialType(
  OmitType(CreateTenantMembershipDto, ['password'] as const),
) {}
