import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';
import { ApiKeyGuard } from '../compartido/guards/api-key.guard';

/**
 * Endpoint interno llamado por n8n para enviar mensajes de WhatsApp via Whapi.
 * Requiere header x-bridge-api-key.
 */
@Controller('whatsapp')
@UseGuards(ApiKeyGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /**
   * Envía un mensaje de texto al paciente via Whapi.
   *
   * POST /whatsapp/enviar
   */
  @Post('enviar')
  async enviarMensaje(
    @Body() dto: EnviarMensajeDto,
  ): Promise<{ enviado: boolean; messageId?: string }> {
    const messageId = await this.whatsappService.enviarTexto(dto.telefono, dto.mensaje);
    return { enviado: true, messageId };
  }
}
