import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'quickly-sites-api',
      timestamp: new Date().toISOString(),
    };
  }
}
