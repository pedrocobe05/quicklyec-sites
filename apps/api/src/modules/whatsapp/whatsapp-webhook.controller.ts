import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Meta WhatsApp Cloud API webhook (subscription verification + event delivery).
 * Outbound reminders are sent by our cron, not by these callbacks.
 */
@Controller('webhooks/whatsapp')
@SkipThrottle()
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get()
  verifySubscription(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') verifyToken: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): void {
    const expected = this.configService.get<string>('app.whatsappWebhookVerifyToken', '');
    if (!expected) {
      this.logger.warn('WHATSAPP_WEBHOOK_VERIFY_TOKEN no está configurado; rechazando verificación');
      res.status(HttpStatus.SERVICE_UNAVAILABLE).send('Webhook no configurado');
      return;
    }

    if (mode === 'subscribe' && verifyToken === expected && typeof challenge === 'string' && challenge.length > 0) {
      res.status(HttpStatus.OK).type('text/plain').send(challenge);
      return;
    }

    res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  receiveEvent(@Body() body: unknown): { ok: true } {
    if (this.configService.get<string>('app.env') === 'development') {
      this.logger.debug(`Webhook POST: ${JSON.stringify(body)}`);
    }
    return { ok: true };
  }
}
