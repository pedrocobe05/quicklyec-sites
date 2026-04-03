import { PartialType } from '@nestjs/swagger';
import { CreateTenantDomainDto } from './create-tenant-domain.dto';

export class UpdateTenantDomainDto extends PartialType(CreateTenantDomainDto) {}
