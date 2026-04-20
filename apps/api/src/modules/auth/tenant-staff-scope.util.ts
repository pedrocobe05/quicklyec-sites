import { ForbiddenException } from '@nestjs/common';
import { STAFF_ROLE_CODE } from '../tenants/tenant-access.constants';
import { Request } from 'express';
import { TenantMembershipEntity } from 'src/common/entities';

export type RequestWithTenantMembership = Request & {
  user?: { sub: string; email: string; isPlatformAdmin?: boolean };
  tenantMembership?: TenantMembershipEntity;
};

/** Código de rol de empresa: prioriza `roleDefinition` y usa la columna legacy `role` si hace falta. */
export function getEffectiveTenantRoleCode(membership: TenantMembershipEntity): string | null {
  const fromDef = membership.roleDefinition?.code?.trim();
  if (fromDef) {
    return fromDef;
  }
  const legacy = membership.role?.trim();
  return legacy || null;
}

/**
 * Si el usuario es rol de empresa `staff`, devuelve el id del profesional vinculado; si falta vínculo, 403.
 * Para administrador de empresa o plataforma, `undefined` (sin restricción por profesional).
 */
export function getStaffScopeIdOrThrow(req: RequestWithTenantMembership): string | undefined {
  if (req.user?.isPlatformAdmin) {
    return undefined;
  }
  const membership = req.tenantMembership;
  if (!membership) {
    return undefined;
  }
  if (getEffectiveTenantRoleCode(membership) !== STAFF_ROLE_CODE) {
    return undefined;
  }
  if (!membership.linkedStaffId) {
    throw new ForbiddenException(
      'Tu cuenta de staff no está vinculada a un profesional. Pide al administrador de la empresa que te asigne el vínculo correcto.',
    );
  }
  return membership.linkedStaffId;
}

/** Rol de empresa `staff` (profesional): no puede crear/editar catálogo de servicios ni fichas de equipo; solo operar su agenda/reservas/clientes. */
export function assertNotTenantOperationalStaff(
  req: RequestWithTenantMembership,
  message = 'Tu rol solo permite operar tu propia agenda, reservas y clientes asociados.',
) {
  if (req.user?.isPlatformAdmin) {
    return;
  }
  const membership = req.tenantMembership;
  if (membership && getEffectiveTenantRoleCode(membership) === STAFF_ROLE_CODE) {
    throw new ForbiddenException(message);
  }
}
