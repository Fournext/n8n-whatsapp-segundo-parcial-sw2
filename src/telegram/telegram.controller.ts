import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { EnviarTelegramDto } from './dto/enviar-telegram.dto';
import { ApiKeyGuard } from '../compartido/guards/api-key.guard';

/**
 * Endpoint interno llamado por n8n para enviar mensajes de Telegram.
 * Requiere header x-bridge-api-key.
 */
@Controller('telegram')
@UseGuards(ApiKeyGuard)
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Envía un mensaje de texto via Telegram Bot API.
   *
   * POST /telegram/enviar
   */
  @Post('enviar')
  async enviarMensaje(
    @Body() dto: EnviarTelegramDto,
  ): Promise<{ enviado: boolean; messageId?: string }> {
    const messageId = await this.telegramService.enviarTexto(
      dto.chatId,
      dto.mensaje,
      dto.parseMode,
    );
    return { enviado: Boolean(messageId), messageId };
  }
}

