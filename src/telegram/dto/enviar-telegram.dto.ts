import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Payload que envía n8n o servicios internos para mandar un mensaje de Telegram */
export class EnviarTelegramDto {
  /** ID del chat de Telegram (número o string, ej: 123456789 o "-100...") */
  @IsString()
  @IsNotEmpty()
  chatId: string;

  /** Texto del mensaje a enviar */
  @IsString()
  @IsNotEmpty()
  mensaje: string;

  /** Modo de parseo de formato opcional ('Markdown' o 'HTML') */
  @IsString()
  @IsOptional()
  parseMode?: string;
}

