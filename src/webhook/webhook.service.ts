import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ChatbotService } from '../chatbot/chatbot.service';

/**
 * Recibe eventos de Whapi (WhatsApp) y de Telegram Bot API.
 * Los procesa mediante la máquina de estados del Chatbot y opcionalmente los reenvía a n8n.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly chatbotService: ChatbotService,
  ) {}

  /**
   * Procesa mensajes entrantes desde Whapi (WhatsApp)
   */
  async procesarEvento(payload: any): Promise<void> {
    this.logger.log(`Payload recibido de Whapi: ${JSON.stringify(payload)}`);

    const messages: any[] = payload?.messages || [];
    
    if (!messages || messages.length === 0) {
      this.logger.debug('Evento ignorado: no contiene un arreglo de mensajes.');
      return;
    }

    for (const msg of messages) {
      const deMi = msg?.from_me ?? msg?.fromMe ?? false;
      
      if (deMi || msg?.type !== 'text') {
        this.logger.debug(`Mensaje descartado (enviado por nosotros o no es texto)`);
        continue;
      }

      let desde = msg.chat_id || msg.chatId || msg.from || '';
      if (desde && !desde.includes('@')) {
        desde = `${desde}@s.whatsapp.net`;
      }

      const texto = (msg.text?.body || msg.body || '').trim();

      if (!texto || !desde) {
        this.logger.warn(`Mensaje incompleto — desde: ${desde}, texto: ${texto}`);
        continue;
      }

      if (desde.startsWith('0@') || desde.startsWith('test') || desde.includes('example')) {
        this.logger.log(`Evento de prueba recibido y verificado correctamente para ${desde}`);
        continue;
      }

      this.logger.log(`Mensaje entrante de WhatsApp [${desde}]: "${texto}"`);
      try {
        await this.chatbotService.procesarMensaje(desde, texto, 'whatsapp');
      } catch (err) {
        this.logger.error(`Error procesando mensaje de ${desde}: ${err?.message || err}`);
      }

      // Reenvío opcional a n8n si N8N_WEBHOOK_URL está configurado
      const n8nUrl = this.config.get<string>('N8N_WEBHOOK_URL');
      if (n8nUrl) {
        try {
          await firstValueFrom(
            this.http.post(n8nUrl, {
              canal: 'whatsapp',
              desde,
              texto,
              messages: [msg],
            }),
          );
        } catch (err) {
          this.logger.debug(`No se pudo reenviar evento de WhatsApp a n8n: ${err?.message}`);
        }
      }
    }
  }

  /**
   * Procesa mensajes entrantes desde Telegram Bot API
   */
  async procesarEventoTelegram(payload: any): Promise<void> {
    this.logger.log(`Payload recibido de Telegram: ${JSON.stringify(payload)}`);

    const msg = payload?.message || payload?.edited_message || payload?.channel_post;
    if (!msg) {
      this.logger.debug('Evento ignorado: no contiene mensaje de Telegram.');
      return;
    }

    const chatId = msg.chat?.id?.toString() || msg.from?.id?.toString() || '';
    const texto = (msg.text || '').trim();

    if (!chatId || !texto) {
      this.logger.warn(`Mensaje de Telegram incompleto — chatId: ${chatId}, texto: ${texto}`);
      return;
    }

    this.logger.log(`Mensaje entrante de Telegram [${chatId}]: "${texto}"`);
    try {
      await this.chatbotService.procesarMensaje(chatId, texto, 'telegram');
    } catch (err) {
      this.logger.error(`Error procesando mensaje de Telegram de ${chatId}: ${err?.message || err}`);
    }

    // Reenvío opcional a n8n si N8N_WEBHOOK_URL está configurado
    const n8nUrl = this.config.get<string>('N8N_WEBHOOK_URL');
    if (n8nUrl) {
      try {
        await firstValueFrom(
          this.http.post(n8nUrl, {
            canal: 'telegram',
            chatId,
            texto,
            message: msg,
          }),
        );
      } catch (err) {
        this.logger.debug(`No se pudo reenviar evento de Telegram a n8n: ${err?.message}`);
      }
    }
  }
}
