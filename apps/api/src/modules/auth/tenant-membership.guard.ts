import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { SubscriptionPlanEntity, TenantEntity, TenantMembershipEntity } from 'src/common/entities';
import type { RequestWithTenantMembership } from './tenant-staff-scope.util';
import { TENANT_MODULE_ACCESS_KEY } from './tenant-module-access.decorator';
import { intersectTenantModules, mergeStoredPlanModulesWithCanonical, normalizePlanCode } from '../tenants/tenant-access.constants';
import { getTenantSubscriptionState } from '../tenants/subscription.utils';

const SUBSCRIPTION_GRACE_PERIOD_DAYS = 3;

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithTenantMembership>();
    const requiredModule = this.reflector.getAllAndOverride<string>(TENANT_MODULE_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const tenantId =
      typeof request.query?.tenantId === 'string'
        ? request.query.tenantId
        : typeof request.params?.tenantId === 'string'
          ? request.params.tenantId
          : typeof request.body?.tenantId === 'string'
            ? request.body.tenantId
            : undefined;

    if (!request.user?.sub) {
      throw new ForbiddenException('Authenticated user not found');
    }

    if (request.user.isPlatformAdmin) {
      return true;
    }

    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const membership = await this.dataSource.getRepository(TenantMembershipEntity).findOne({
      where: {
        userId: request.user.sub,
        tenantId,
        isActive: true,
      },
      relations: ['roleDefinition'],
    });

    if (!membership) {
      throw new ForbiddenException('User does not belong to this tenant');
    }

    request.tenantMembership = membership;

    if (!requiredModule) {
      return true;
    }

    const tenant = await this.dataSource.getRepository(TenantEntity).findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    const subscription = getTenantSubscriptionState({
      subscriptionStartsAt: tenant.subscriptionStartsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
    });

    if (
      subscription.daysUntilExpiry !== null
      && subscription.daysUntilExpiry < -SUBSCRIPTION_GRACE_PERIOD_DAYS
    ) {
      throw new ForbiddenException(
        `Acceso deshabilitado: la suscripción venció hace más de ${SUBSCRIPTION_GRACE_PERIOD_DAYS} días. Renueva para continuar.`,
      );
    }

    const normalizedPlanCode = normalizePlanCode(tenant.plan);
    const planRecord = await this.dataSource.getRepository(SubscriptionPlanEntity).findOne({
      where: { code: normalizedPlanCode, isActive: true },
    });
    const planModules = mergeStoredPlanModulesWithCanonical(
      planRecord?.tenantModules?.length ? planRecord.tenantModules : undefined,
      normalizedPlanCode,
    );
    const rolePermissions = membership.roleDefinition?.permissions ?? membership.permissions ?? [];
    const effectiveModules = intersectTenantModules(planModules, rolePermissions);

    if (!effectiveModules.includes(requiredModule)) {
      throw new ForbiddenException('This module is not available for the current plan or role');
    }

    return true;
  }
}
