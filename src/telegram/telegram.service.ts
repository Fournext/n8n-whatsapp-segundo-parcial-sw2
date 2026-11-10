import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Cliente REST de la API oficial de Telegram Bot para enviar mensajes.
 * Documentación: https://core.telegram.org/bots/api#sendmessage
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Envía un mensaje de texto a un chat o usuario de Telegram.
   *
   * @param chatId    - ID del chat de Telegram (ej: "123456789")
   * @param texto     - Mensaje con formato (Markdown o texto plano)
   * @param parseMode - Modo opcional ('Markdown' o 'HTML', por defecto 'Markdown')
   */
  async enviarTexto(chatId: string, texto: string, parseMode: string = 'Markdown'): Promise<string> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token) {
      this.logger.warn(`TELEGRAM_BOT_TOKEN no configurado en .env. No se envió mensaje a ${chatId}.`);
      return '';
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const resp = await firstValueFrom(
        this.http.post(
          url,
          {
            chat_id: chatId,
            text: texto,
            parse_mode: parseMode,
          },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const messageId = resp.data?.result?.message_id?.toString() || '';
      this.logger.log(`Mensaje de Telegram enviado a ${chatId} — message_id: ${messageId}`);
      return messageId;
    } catch (err) {
      const errorDetalle = err?.response?.data ? JSON.stringify(err.response.data) : err?.message;
      this.logger.error(`Error Telegram API para ${chatId}: ${errorDetalle}`);
      throw new InternalServerErrorException('No se pudo enviar el mensaje de Telegram');
    }
  }
}

