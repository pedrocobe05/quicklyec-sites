import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { QueryFailedError } from 'typeorm';
import { AuthenticatedRequest } from '../types/authenticated-request.type';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';
import { IdempotencyKeyRepository } from './repositories/idempotency-key.repository';

interface ReserveRequestInput {
  request: AuthenticatedRequest;
}

type ReserveResult =
  | {
      kind: 'replay';
      record: IdempotencyKeyEntity;
    }
  | {
      kind: 'fresh';
      record: IdempotencyKeyEntity;
    };

@Injectable()
export class IdempotencyService {
  private static readonly TENANT_FALLBACK = '__global__';
  private static readonly USER_FALLBACK = '__anonymous__';

  constructor(private readonly repository: IdempotencyKeyRepository) {}

  async reserve(input: ReserveRequestInput): Promise<ReserveResult> {
    await this.repository.deleteExpired(new Date());

    const key = this.extractIdempotencyKey(input.request);
    const requestHash = this.buildRequestHash(input.request.body ?? {});
    const scope = this.resolveScope(input.request);

    const existing = await this.repository.findByKey({
      tenantScope: scope.tenantScope,
      userScope: scope.userScope,
      method: scope.method,
      route: scope.route,
      key,
    });

    if (existing) {
      this.assertCompatible(existing, requestHash);
      return existing.status === 'COMPLETED'
        ? { kind: 'replay', record: existing }
        : this.throwInFlightConflict();
    }

    try {
      const record = await this.repository.save(
        this.repository.create({
          tenantScope: scope.tenantScope,
          userScope: scope.userScope,
          method: scope.method,
          route: scope.route,
          key,
          requestHash,
          status: 'PROCESSING',
          responseCode: null,
          responseBody: null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );

      return { kind: 'fresh', record };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        typeof (error as { driverError?: { code?: string } }).driverError?.code === 'string' &&
        (error as { driverError?: { code?: string } }).driverError?.code === '23505'
      ) {
        const concurrent = await this.repository.findByKey({
          tenantScope: scope.tenantScope,
          userScope: scope.userScope,
          method: scope.method,
          route: scope.route,
          key,
        });

        if (!concurrent) {
          throw error;
        }

        this.assertCompatible(concurrent, requestHash);
        return concurrent.status === 'COMPLETED'
          ? { kind: 'replay', record: concurrent }
          : this.throwInFlightConflict();
      }

      throw error;
    }
  }

  async complete(recordId: string, responseCode: number, responseBody: unknown): Promise<void> {
    await this.repository.updateById(recordId, {
      status: 'COMPLETED',
      responseCode,
      responseBody: this.normalizeResponseBody(responseBody),
    });
  }

  async release(record: IdempotencyKeyEntity): Promise<void> {
    await this.repository.remove(record);
  }

  private extractIdempotencyKey(request: AuthenticatedRequest): string {
    const headerValue = request.headers['idempotency-key'];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!key?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required for this operation');
    }

    return key.trim();
  }

  private resolveScope(request: AuthenticatedRequest) {
    const queryTenantId =
      typeof request.query?.tenantId === 'string'
        ? request.query.tenantId
        : Array.isArray(request.query?.tenantId)
          ? request.query.tenantId[0]
          : undefined;
    const queryHost =
      typeof request.query?.host === 'string'
        ? request.query.host
        : Array.isArray(request.query?.host)
          ? request.query.host[0]
          : undefined;
    const headerHost = Array.isArray(request.headers.host) ? request.headers.host[0] : request.headers.host;

    const tenantScope =
      request.user?.tenantId ??
      queryTenantId ??
      (Array.isArray(request.headers['x-tenant-id'])
        ? request.headers['x-tenant-id'][0]
        : request.headers['x-tenant-id']) ??
      queryHost ??
      headerHost ??
      IdempotencyService.TENANT_FALLBACK;

    const userScope = request.user?.sub ?? IdempotencyService.USER_FALLBACK;
    const method = request.method.toUpperCase();
    const route = `${request.baseUrl}${request.route?.path ?? request.path}`;

    return {
      tenantScope,
      userScope,
      method,
      route,
    };
  }

  private buildRequestHash(payload: unknown): string {
    return createHash('sha256').update(this.stableStringify(payload)).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );

    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${this.stableStringify(entryValue)}`)
      .join(',')}}`;
  }

  private assertCompatible(record: IdempotencyKeyEntity, requestHash: string): void {
    if (record.requestHash !== requestHash) {
      throw new ConflictException('This Idempotency-Key was already used with a different request payload');
    }
  }

  private throwInFlightConflict(): never {
    throw new ConflictException('A request with this Idempotency-Key is already being processed');
  }

  private normalizeResponseBody(responseBody: unknown): IdempotencyKeyEntity['responseBody'] {
    if (responseBody === undefined) {
      return null;
    }

    return JSON.parse(JSON.stringify(responseBody)) as IdempotencyKeyEntity['responseBody'];
  }
}
