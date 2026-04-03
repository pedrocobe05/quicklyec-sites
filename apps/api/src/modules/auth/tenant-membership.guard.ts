import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { SubscriptionPlanEntity, TenantEntity, TenantMembershipEntity } from 'src/common/entities';
import { TENANT_MODULE_ACCESS_KEY } from './tenant-module-access.decorator';
import { getPlanAccessDefinition, intersectTenantModules, normalizePlanCode } from '../tenants/tenant-access.constants';

type TenantAwareRequest = Request & {
  user?: {
    sub: string;
    email: string;
    isPlatformAdmin?: boolean;
  };
  query: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  body?: Record<string, unknown>;
};

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<TenantAwareRequest>();
    const requiredModule = this.reflector.getAllAndOverride<string>(TENANT_MODULE_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const tenantId =
      request.query.tenantId ??
      request.params.tenantId ??
      (typeof request.body?.tenantId === 'string' ? request.body.tenantId : undefined);

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

    if (!requiredModule) {
      return true;
    }

    const tenant = await this.dataSource.getRepository(TenantEntity).findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    const normalizedPlanCode = normalizePlanCode(tenant.plan);
    const planRecord = await this.dataSource.getRepository(SubscriptionPlanEntity).findOne({
      where: { code: normalizedPlanCode, isActive: true },
    });
    const planModules = planRecord?.tenantModules?.length
      ? planRecord.tenantModules
      : getPlanAccessDefinition(normalizedPlanCode).modules;
    const rolePermissions = membership.roleDefinition?.permissions ?? [];
    const effectiveModules = intersectTenantModules(planModules, rolePermissions);

    if (!effectiveModules.includes(requiredModule)) {
      throw new ForbiddenException('This module is not available for the current plan or role');
    }

    return true;
  }
}
