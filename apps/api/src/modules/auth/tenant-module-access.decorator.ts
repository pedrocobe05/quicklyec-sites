import { SetMetadata } from '@nestjs/common';

export const TENANT_MODULE_ACCESS_KEY = 'tenantModuleAccess';

export const TenantModuleAccess = (moduleCode: string) => SetMetadata(TENANT_MODULE_ACCESS_KEY, moduleCode);
