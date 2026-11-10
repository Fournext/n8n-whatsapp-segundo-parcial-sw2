import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Payload para enviar notificaciones de correo electrónico de Gimnasio (Renovaciones, Vencimientos, Promociones)
 */
export class EnviarEmailDto {
  @IsEmail()
  para: string;

  @IsString()
  @IsNotEmpty()
  asunto: string;

  /** Nombre del socio */
  @IsString()
  @IsNotEmpty()
  nombre: string;

  /** Tipo de notificación: 'CONFIRMACION_RENOVACION' | 'AVISO_VENCIMIENTO' | 'PROMOCION' */
  @IsString()
  @IsOptional()
  tipo?: 'CONFIRMACION_RENOVACION' | 'AVISO_VENCIMIENTO' | 'PROMOCION';

  /** Nombre del plan del gimnasio (ej: "Plan Trimestral Black", "Plan Mensual Estándar") */
  @IsString()
  @IsOptional()
  plan?: string;

  /** Fecha de vencimiento formateada (ej: "25 de Noviembre de 2026") */
  @IsString()
  @IsOptional()
  fechaVencimiento?: string;

  /** Días restantes antes del vencimiento */
  @IsOptional()
  diasRestantes?: number | string;

  /** Monto pagado o precio del plan (ej: "Bs. 650") */
  @IsString()
  @IsOptional()
  monto?: string;

  /** Texto adicional o detalles de la promoción */
  @IsString()
  @IsOptional()
  mensaje?: string;

  // Compatibilidad con campos anteriores
  @IsString()
  @IsOptional()
  fechaHora?: string;

  @IsString()
  @IsOptional()
  motivo?: string;
}
