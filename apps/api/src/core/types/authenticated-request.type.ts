import { Request } from 'express';

export type AuthenticatedRequest = Request & {
  requestId?: string;
  requestStartTime?: number;
  user?: {
    sub?: string;
    tenantId?: string;
  };
};
