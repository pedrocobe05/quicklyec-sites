import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.resolveMessage(exceptionResponse, exception);
    const startedAt = request.requestStartTime ?? Date.now();
    const durationMs = Date.now() - startedAt;

    this.logger.error(
      JSON.stringify({
        event: 'http.request.failed',
        requestId: request.requestId ?? null,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode: status,
        durationMs,
        userId: request.user?.sub ?? null,
        tenantId:
          (typeof request.headers['x-tenant-id'] === 'string' ? request.headers['x-tenant-id'] : undefined) ??
          request.query?.tenantId ??
          request.params?.tenantId ??
          null,
        message,
        error: exception instanceof Error ? { name: exception.name, stack: exception.stack } : null,
      }),
    );

    const payload: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (process.env.PAYPHONE_EXPOSE_RAW_RESPONSE === 'true' && exceptionResponse && typeof exceptionResponse === 'object') {
      const ex = exceptionResponse as Record<string, unknown>;
      if (typeof ex.payphoneRawBody === 'string') {
        payload.payphoneRawBody = ex.payphoneRawBody;
      }
      if (typeof ex.payphoneHttpStatus === 'number') {
        payload.payphoneHttpStatus = ex.payphoneHttpStatus;
      }
      if ('payphoneParsed' in ex) {
        payload.payphoneParsed = ex.payphoneParsed;
      }
    }

    response.status(status).json(payload);
  }

  private resolveMessage(exceptionResponse: string | object | null, exception: unknown): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exceptionResponse && typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      return (exceptionResponse as { message: string | string[] }).message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }
}
