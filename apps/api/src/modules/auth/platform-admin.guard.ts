import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

type PlatformRequest = Request & {
  user?: {
    sub: string;
    email: string;
    isPlatformAdmin?: boolean;
    platformRole?: string;
  };
};

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<PlatformRequest>();
    if (!request.user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin access required');
    }
    return true;
  }
}
