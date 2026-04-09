import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, lastValueFrom } from 'rxjs';
import { IDEMPOTENT_ROUTE_KEY } from '../decorators/idempotent.decorator';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isEnabled = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isEnabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<{
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      status: (code: number) => unknown;
    }>();

    return from(
      (async () => {
        const reservation = await this.idempotencyService.reserve({ request });

        if (reservation.kind === 'replay') {
          response.setHeader('x-idempotency-replayed', 'true');
          if (reservation.record.responseCode) {
            response.status(reservation.record.responseCode);
          }
          return reservation.record.responseBody;
        }

        const record = reservation.record;

        try {
          const result = await lastValueFrom(next.handle());
          await this.idempotencyService.complete(record.id, response.statusCode, result);
          return result;
        } catch (error) {
          await this.idempotencyService.release(record);
          throw error;
        }
      })(),
    );
  }
}
