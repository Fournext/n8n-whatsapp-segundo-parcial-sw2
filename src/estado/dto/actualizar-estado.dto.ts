import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export const ESTADOS_VALIDOS = [
  'INICIO',
  'MENU',
  'MENU_SELECCION',
  'ESPERANDO_CI',
  'ESPERANDO_CI_ESTADO',
  'SELECCIONANDO_PLAN',
  'SELECCION_PLAN',
  'CONFIRMAR_RENOVACION',
  'CONFIRMAR_ACCION_ESTADO',
  'REGISTRO_NOMBRE',
  'REGISTRO_APELLIDO',
  'REGISTRO_CI',
  'REGISTRO_EMAIL',
  'ESPERANDO_NOMBRE',
  'ESPERANDO_APELLIDO',
  'ESPERANDO_EMAIL',
  'CONFIRMAR_CITA',
  'ESPERANDO_FECHA_HORA',
  'COMPLETADO',
] as const;

export type EstadoConversacion = (typeof ESTADOS_VALIDOS)[number] | string;

/** Payload para actualizar el estado de una conversación de WhatsApp */
export class ActualizarEstadoDto {
  @IsString()
  @IsNotEmpty()
  estado: EstadoConversacion;

  /** Datos acumulados de la conversación */
  @IsObject()
  datos: Record<string, any>;
}
