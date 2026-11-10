import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { EnviarEmailDto } from './dto/enviar-email.dto';
import { ApiKeyGuard } from '../compartido/guards/api-key.guard';

/**
 * Endpoint interno llamado por n8n para enviar emails de confirmación via SMTP.
 * Requiere header x-bridge-api-key.
 */
@Controller('email')
@UseGuards(ApiKeyGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Envía email de confirmación de cita al paciente.
   *
   * POST /email/enviar
   */
  @Post('enviar')
  async enviarEmail(@Body() dto: EnviarEmailDto): Promise<{ enviado: boolean }> {
    await this.emailService.enviarConfirmacion(dto);
    return { enviado: true };
  }
}
