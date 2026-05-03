import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappCloudService } from './whatsapp-cloud.service';

type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: IncomingMessage[];
      };
    }>;
  }>;
};

type IncomingMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
};

type MenuOptionId = 'about_quickly_sites' | 'booking_info' | 'technical_support';

const MENU_OPTIONS: Array<{
  id: MenuOptionId;
  title: string;
  description: string;
}> = [
  {
    id: 'about_quickly_sites',
    title: 'QuicklyEC Sites',
    description: 'Conoce la solucion y como funciona.',
  },
  {
    id: 'booking_info',
    title: 'Informacion reservas',
    description: 'Agenda, gestion de citas y disponibilidad.',
  },
  {
    id: 'technical_support',
    title: 'Soporte tecnico',
    description: 'Habla con el equipo de soporte de QuicklyEC.',
  },
];

@Injectable()
export class WhatsappInboundService {
  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappCloud: WhatsappCloudService,
  ) {}

  async handleWebhook(body: unknown): Promise<void> {
    const payload = body as WebhookPayload;
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const messages = Array.isArray(change?.value?.messages) ? change.value.messages : [];
        for (const message of messages) {
          await this.handleIncomingMessage(message);
        }
      }
    }
  }

  private async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    if (!message.from || !message.id) {
      return;
    }

    if (message.type === 'interactive') {
      const selectedId = this.extractInteractiveSelection(message);
      if (!selectedId) {
        return;
      }
      await this.sendOptionResponse(message.from, selectedId, message.id);
      return;
    }

    if (message.type === 'text') {
      const selectedId = this.matchTextToOption(message.text?.body);
      if (selectedId) {
        await this.sendOptionResponse(message.from, selectedId, message.id);
        return;
      }

      await this.sendGreetingMenu(message.from, message.id);
    }
  }

  private extractInteractiveSelection(message: IncomingMessage): MenuOptionId | null {
    const buttonId = message.interactive?.button_reply?.id;
    const listId = message.interactive?.list_reply?.id;
    const selectedId = buttonId ?? listId;

    if (selectedId === 'about_quickly_sites' || selectedId === 'booking_info' || selectedId === 'technical_support') {
      return selectedId;
    }

    return null;
  }

  private matchTextToOption(text: string | undefined): MenuOptionId | null {
    const normalized = this.normalizeText(text);
    if (!normalized) {
      return null;
    }

    if (normalized.includes('soporte') || normalized.includes('tecnico') || normalized.includes('tecnica')) {
      return 'technical_support';
    }

    if (normalized.includes('reserva') || normalized.includes('cita') || normalized.includes('agenda')) {
      return 'booking_info';
    }

    if (normalized.includes('quickly') || normalized.includes('site') || normalized.includes('pagina')) {
      return 'about_quickly_sites';
    }

    return null;
  }

  private async sendGreetingMenu(to: string, replyToMessageId: string): Promise<void> {
    await this.whatsappCloud.sendListMessage({
      to,
      replyToMessageId,
      bodyText:
        'Hola. Este es un numero que envia mensajes automaticos.\n\nSi deseas ayuda, elige una de estas opciones:',
      footerText: 'QuicklyEC',
      buttonText: 'Ver opciones',
      sectionTitle: 'Opciones disponibles',
      rows: MENU_OPTIONS,
    });
  }

  private async sendOptionResponse(to: string, optionId: MenuOptionId, replyToMessageId: string): Promise<void> {
    const supportNumber = this.configService.get<string>('app.whatsappSupportTargetNumber', '593962857535');
    const link = this.buildWhatsAppLink(supportNumber, this.getPrefilledText(optionId));

    const textByOption: Record<MenuOptionId, string> = {
      about_quickly_sites:
        `QuicklyEC Sites permite crear sitios para negocios de servicios con informacion publica, reservas y administracion basica.\n\nSi quieres saber mas, escribe aqui: ${link}`,
      booking_info:
        `Las reservas permiten mostrar disponibilidad y recibir solicitudes o citas desde el sitio.\n\nSi necesitas mas informacion sobre reservas, escribe aqui: ${link}`,
      technical_support:
        `Si necesitas soporte tecnico, por favor da click en este link que te llevara al chat con el equipo de soporte: ${link}`,
    };

    await this.whatsappCloud.sendTextMessage({
      to,
      replyToMessageId,
      bodyText: textByOption[optionId],
    });
  }

  private buildWhatsAppLink(phoneNumber: string, text: string): string {
    const digits = phoneNumber.replace(/\D/g, '');
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  private getPrefilledText(optionId: MenuOptionId): string {
    const texts: Record<MenuOptionId, string> = {
      about_quickly_sites: 'Hola equipo QuicklyEC, quiero saber mas sobre QuicklyEC Sites.',
      booking_info: 'Hola equipo QuicklyEC, necesito informacion sobre reservas en QuicklyEC Sites.',
      technical_support: 'Hola equipo QuicklyEC, necesito soporte tecnico con QuicklyEC Sites.',
    };
    return texts[optionId];
  }

  private normalizeText(text: string | undefined): string {
    return (text ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
