import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Cliente REST de Whapi para enviar mensajes de WhatsApp.
 * Documentación: https://whapi.cloud/
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Envía un mensaje de texto al número destino.
   *
   * @param telefono - Número en formato "591XXXXXXXXX" o "591XXXXXXXXX@s.whatsapp.net"
   * @param texto    - Texto a enviar (soporta *negrita* y _cursiva_ de WhatsApp)
   * @returns ID del mensaje enviado por Whapi
   */
  async enviarTexto(telefono: string, texto: string): Promise<string> {
    const baseUrl = this.config.get<string>('WHAPI_BASE_URL');
    const token = this.config.get<string>('WHAPI_TOKEN');

    // Normalizar: asegurar sufijo @s.whatsapp.net
    const destino = telefono.includes('@') ? telefono : `${telefono}@s.whatsapp.net`;

    try {
      const resp = await firstValueFrom(
        this.http.post(
          `${baseUrl}/messages/text`,
          { to: destino, body: texto },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
        ),
      );
      const messageId: string = resp.data?.id || resp.data?.sent_id || '';
      this.logger.log(`Mensaje enviado a ${destino} — id: ${messageId}`);
      return messageId;
    } catch (err) {
      const errorDetalle = err?.response?.data ? JSON.stringify(err.response.data) : err?.message;
      this.logger.error(`Error Whapi: ${errorDetalle}`);
      throw new InternalServerErrorException('No se pudo enviar el mensaje de WhatsApp');
    }
  }
}
