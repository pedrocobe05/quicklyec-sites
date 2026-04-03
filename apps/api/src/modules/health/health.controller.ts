import { Controller, Get } from '@nestjs/common';

@Controller('health')
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
