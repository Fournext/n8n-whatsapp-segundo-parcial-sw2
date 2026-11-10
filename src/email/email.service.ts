import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EnviarEmailDto } from './dto/enviar-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Envía emails del gimnasio (Renovación, Vencimiento, Promociones) usando credenciales SMTP.
   */
  async enviarConfirmacion(dto: EnviarEmailDto): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.config.get<number>('SMTP_PORT')) || 587;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!user || !pass) {
      this.logger.warn(`SMTP_USER o SMTP_PASS no configurados. Simulando envío a ${dto.para}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const html = this.construirHtml(dto);

    try {
      await transporter.sendMail({
        from: `"Titan Gym & Fitness" <${user}>`,
        to: dto.para,
        subject: dto.asunto || 'Notificación de Membresía — Titan Gym',
        html,
      });
      this.logger.log(`Email de gimnasio (${dto.tipo || 'GENERAL'}) enviado a ${dto.para}`);
    } catch (err) {
      this.logger.error(`Error SMTP: ${err?.message}`);
      throw new InternalServerErrorException('No se pudo enviar el correo de notificación');
    }
  }

  private construirHtml(dto: EnviarEmailDto): string {
    const gymName = 'Titan Gym & Fitness';
    const plan = dto.plan || 'Plan Activo';
    const fechaVenc = dto.fechaVencimiento || dto.fechaHora || 'Próximamente';
    const monto = dto.monto ? `<div class="info-row"><strong>Inversión:</strong> <span>${dto.monto}</span></div>` : '';
    const dias = dto.diasRestantes !== undefined ? `<div class="badge-warning">⏳ Quedan ${dto.diasRestantes} días</div>` : '';

    let headerTitle = 'Titan Gym & Fitness';
    let bannerTitle = '¡Tu entrenamiento no se detiene!';
    let badgeColor = '#e11d48'; // Gym rose/red
    let badgeText = 'MEMBRESÍA ACTIVA';

    if (dto.tipo === 'CONFIRMACION_RENOVACION') {
      headerTitle = '¡Membresía Renovada Exitosamente!';
      bannerTitle = '🎉 ¡Gracias por seguir formando parte de nuestra comunidad!';
      badgeColor = '#10b981'; // Green
      badgeText = 'RENOVACIÓN CONFIRMADA';
    } else if (dto.tipo === 'AVISO_VENCIMIENTO') {
      headerTitle = '⚠️ Aviso de Vencimiento de Membresía';
      bannerTitle = '¡No pierdas tu racha de entrenamiento!';
      badgeColor = '#f59e0b'; // Amber
      badgeText = 'PRÓXIMO A VENCER';
    } else if (dto.tipo === 'PROMOCION') {
      headerTitle = '🔥 ¡Promoción Exclusiva para Ti!';
      bannerTitle = 'Aprovecha estos beneficios para alcanzar tu mejor versión';
      badgeColor = '#6366f1'; // Indigo
      badgeText = 'OFERTA ESPECIAL';
    }

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${dto.asunto}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #334155; }
    .container { background: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.25); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 36px 30px; text-align: center; border-bottom: 4px solid #e11d48; }
    .logo-badge { display: inline-block; background: #e11d48; color: white; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 14px; color: #94a3b8; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; }
    .badge-status { display: inline-block; background: ${badgeColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; margin: 10px 0 16px; }
    .badge-warning { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; margin-bottom: 14px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 18px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-row strong { color: #475569; }
    .info-row span { color: #0f172a; font-weight: 600; }
    .custom-message { background: #fff1f2; border-left: 4px solid #e11d48; padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 14px; color: #881337; margin: 18px 0; line-height: 1.5; }
    .btn-action { display: block; width: fit-content; margin: 24px auto 8px; background: #e11d48; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-align: center; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; }
    .footer strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">FITNESS & TRAINING</div>
      <h1>${gymName}</h1>
      <p>${bannerTitle}</p>
    </div>
    
    <div class="body">
      <p class="greeting">¡Hola, ${dto.nombre}!</p>
      <div class="badge-status">${badgeText}</div>
      ${dias}

      ${dto.mensaje ? `<div class="custom-message">${dto.mensaje}</div>` : ''}

      <div class="card">
        <div class="info-row">
          <strong>Socio:</strong>
          <span>${dto.nombre}</span>
        </div>
        <div class="info-row">
          <strong>Plan Contratado:</strong>
          <span>${plan}</span>
        </div>
        <div class="info-row">
          <strong>Vencimiento:</strong>
          <span>${fechaVenc}</span>
        </div>
        ${monto}
        <div class="info-row">
          <strong>Estado de Acceso:</strong>
          <span style="color: #10b981;">Habilitado (Torno y Huella)</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
        Puedes renovar tu plan o consultar tu estado en cualquier momento directamente respondiendo a nuestro canal oficial de WhatsApp.
      </p>

      <a href="https://wa.me/" class="btn-action">Gestionar en WhatsApp</a>
    </div>

    <div class="footer">
      <p><strong>${gymName}</strong> • Pasión por el Rendimiento</p>
      <p>Horarios: Lunes a Viernes 06:00 - 22:00 | Sábados 08:00 - 18:00</p>
      <p>Este es un mensaje automático del sistema de membresías del gimnasio.</p>
    </div>
  </div>
</body>
</html>`;
  }
}
