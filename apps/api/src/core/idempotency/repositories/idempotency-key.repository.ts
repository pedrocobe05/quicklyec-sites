import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { IdempotencyKeyEntity } from '../entities/idempotency-key.entity';

@Injectable()
export class IdempotencyKeyRepository {
  constructor(
    @InjectRepository(IdempotencyKeyEntity)
    private readonly repository: Repository<IdempotencyKeyEntity>,
  ) {}

  findByKey(input: {
    tenantScope: string;
    userScope: string;
    method: string;
    route: string;
    key: string;
  }): Promise<IdempotencyKeyEntity | null> {
    return this.repository.findOne({
      where: {
        tenantScope: input.tenantScope,
        userScope: input.userScope,
        method: input.method,
        route: input.route,
        key: input.key,
      },
    });
  }

  create(data: Partial<IdempotencyKeyEntity>): IdempotencyKeyEntity {
    return this.repository.create(data);
  }

  save(entity: IdempotencyKeyEntity): Promise<IdempotencyKeyEntity> {
    return this.repository.save(entity);
  }

  async updateById(id: string, data: Partial<IdempotencyKeyEntity>): Promise<void> {
    await this.repository.update(id, data as never);
  }

  async remove(entity: IdempotencyKeyEntity): Promise<void> {
    await this.repository.remove(entity);
  }

  async deleteExpired(now: Date): Promise<void> {
    await this.repository.delete({
      expiresAt: LessThanOrEqual(now),
    });
  }
}
