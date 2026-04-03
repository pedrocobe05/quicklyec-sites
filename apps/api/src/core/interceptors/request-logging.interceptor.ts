import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, tap } from 'rxjs';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<{ setHeader: (name: string, value: string) => void; statusCode: number }>();

    const headerRequestId = request.headers['x-request-id'];
    const requestId = (typeof headerRequestId === 'string' && headerRequestId.trim()) || randomUUID();
    const startedAt = Date.now();

    request.requestId = requestId;
    request.requestStartTime = startedAt;
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              event: 'http.request.completed',
              requestId,
              method: request.method,
              path: request.originalUrl ?? request.url,
              statusCode: response.statusCode,
              durationMs: Date.now() - startedAt,
              userId: request.user?.sub ?? null,
              tenantId:
                (typeof request.headers['x-tenant-id'] === 'string' ? request.headers['x-tenant-id'] : undefined) ??
                request.query?.tenantId ??
                request.params?.tenantId ??
                null,
              ipAddress: request.ip,
            }),
          );
        },
      }),
    );
  }
}
