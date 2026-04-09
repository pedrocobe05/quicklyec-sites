import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_ROUTE_KEY = 'idempotent-route';

export const Idempotent = () => SetMetadata(IDEMPOTENT_ROUTE_KEY, true);
