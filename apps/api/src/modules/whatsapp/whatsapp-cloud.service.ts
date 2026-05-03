import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GraphSendResponse = {
  messaging_product?: string;
  contacts?: { input: string; wa_id: string }[];
  messages?: { id: string }[];
  error?: { message: string; type?: string; code?: number; error_subcode?: number };
};

type GraphMessagePayload = {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template' | 'text' | 'interactive';
  context?: {
    message_id: string;
  };
  template?: Record<string, unknown>;
  text?: {
    body: string;
    preview_url?: boolean;
  };
  interactive?: {
    type: 'list';
    body: { text: string };
    footer?: { text: string };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
};

@Injectable()
export class WhatsappCloudService {
  private readonly logger = new Logger(WhatsappCloudService.name);

  constructor(private readonly configService: ConfigService) {}

  normalizeToDigits(to: string): string {
    const trimmed = to.trim().replace(/[\s()-]/g, '');
    const withoutPlus = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    if (!/^\d{10,15}$/.test(withoutPlus)) {
      throw new BadRequestException(
        'Número inválido: usa formato internacional sin símbolos (ej. 593991234567 o +593 99 123 4567 en el cliente y aquí sin espacios).',
      );
    }
    return withoutPlus;
  }

  async sendTemplateMessage(input: {
    to: string;
    templateName: string;
    languageCode: string;
    bodyParams?: string[];
  }): Promise<{ messageId: string; waId?: string }> {
    const template: Record<string, unknown> = {
      name: input.templateName,
      language: { code: input.languageCode },
    };

    if (input.bodyParams?.length) {
      template.components = [
        {
          type: 'body',
          parameters: input.bodyParams.map((text) => ({ type: 'text', text })),
        },
      ];
    }

    return this.sendMessage({
      to: input.to,
      payload: {
        messaging_product: 'whatsapp',
        to: this.normalizeToDigits(input.to),
        type: 'template',
        template,
      },
    });
  }

  async sendTextMessage(input: {
    to: string;
    bodyText: string;
    replyToMessageId?: string;
  }): Promise<{ messageId: string; waId?: string }> {
    return this.sendMessage({
      to: input.to,
      payload: {
        messaging_product: 'whatsapp',
        to: this.normalizeToDigits(input.to),
        type: 'text',
        context: input.replyToMessageId ? { message_id: input.replyToMessageId } : undefined,
        text: {
          body: input.bodyText,
          preview_url: true,
        },
      },
    });
  }

  async sendListMessage(input: {
    to: string;
    bodyText: string;
    buttonText: string;
    sectionTitle: string;
    rows: Array<{ id: string; title: string; description?: string }>;
    footerText?: string;
    replyToMessageId?: string;
  }): Promise<{ messageId: string; waId?: string }> {
    return this.sendMessage({
      to: input.to,
      payload: {
        messaging_product: 'whatsapp',
        to: this.normalizeToDigits(input.to),
        type: 'interactive',
        context: input.replyToMessageId ? { message_id: input.replyToMessageId } : undefined,
        interactive: {
          type: 'list',
          body: { text: input.bodyText },
          footer: input.footerText ? { text: input.footerText } : undefined,
          action: {
            button: input.buttonText,
            sections: [
              {
                title: input.sectionTitle,
                rows: input.rows,
              },
            ],
          },
        },
      },
    });
  }

  private async sendMessage(input: {
    to: string;
    payload: GraphMessagePayload;
  }): Promise<{ messageId: string; waId?: string }> {
    const token = this.configService.get<string>('app.whatsappAccessToken', '')?.trim();
    const phoneNumberId = this.configService.get<string>('app.whatsappPhoneNumberId', '')?.trim();
    const version = this.configService.get<string>('app.whatsappGraphApiVersion', 'v22.0')?.trim() || 'v22.0';

    if (!token || !phoneNumberId) {
      throw new ServiceUnavailableException(
        'WhatsApp Cloud API no configurada: define WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID.',
      );
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    const body = input.payload;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as GraphSendResponse;

    if (!res.ok || json.error) {
      const msg = json.error?.message ?? res.statusText;
      this.logger.warn(`Graph API error (${res.status}): ${msg}`);
      throw new BadRequestException(msg || 'Error enviando plantilla por WhatsApp');
    }

    const messageId = json.messages?.[0]?.id;
    if (!messageId) {
      this.logger.warn(`Respuesta inesperada de Graph: ${JSON.stringify(json)}`);
      throw new BadRequestException('WhatsApp no devolvió message id');
    }

    return { messageId, waId: json.contacts?.[0]?.wa_id };
  }
}
