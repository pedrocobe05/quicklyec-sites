import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';
import { IdempotencyKeyRepository } from './repositories/idempotency-key.repository';
import { IdempotencyService } from './idempotency.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyKeyEntity])],
  providers: [IdempotencyKeyRepository, IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
