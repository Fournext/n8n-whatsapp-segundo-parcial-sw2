import { IsNotEmpty, IsString } from 'class-validator';

/** Payload que envía n8n para mandar un mensaje de WhatsApp al paciente */
export class EnviarMensajeDto {
  /** Número destino en formato Whapi: "591XXXXXXXXX@s.whatsapp.net" o "591XXXXXXXXX" */
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;
}
