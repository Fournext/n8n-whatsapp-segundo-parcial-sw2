import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { WebhookService } from './webhook.service';

/**
 * Endpoint público que recibe todos los eventos de Whapi.
 * No requiere autenticación: Whapi envía directamente aquí via ngrok.
 * Prefijo: /webhook
 */
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Recibe eventos de Whapi (mensajes, receipts, status).
   * Soporta tanto '/whatsapp' directo como '/whatsapp/messages' que agrega Whapi por defecto.
   *
   * POST /webhook/whatsapp o POST /webhook/whatsapp/messages
   */
  @Post(['whatsapp', 'whatsapp/messages'])
  @HttpCode(200)
  async recibirEvento(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ status: string }> {
    await this.webhookService.procesarEvento(payload);
    return { status: 'ok' };
  }
}
