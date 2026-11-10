import { Injectable, Logger } from '@nestjs/common';
import { ActualizarEstadoDto, EstadoConversacion } from './dto/actualizar-estado.dto';

export interface EntradaEstado {
  estado: EstadoConversacion;
  datos: Record<string, any>;
  ultimaActualizacion: Date;
}

/**
 * Store en memoria (Map) de conversaciones activas.
 * Las conversaciones que no se actualizan en más de 30 minutos se limpian automáticamente.
 */
@Injectable()
export class EstadoService {
  private readonly logger = new Logger(EstadoService.name);
  private readonly store = new Map<string, EntradaEstado>();
  private readonly TTL_MS = 30 * 60 * 1000; // 30 minutos

  constructor() {
    // Limpieza periódica de conversaciones expiradas cada 5 minutos
    setInterval(() => this.limpiarExpirados(), 5 * 60 * 1000);
  }

  obtener(telefono: string): EntradaEstado | null {
    const entrada = this.store.get(telefono);
    if (!entrada) return null;
    // Expiración por inactividad
    if (Date.now() - entrada.ultimaActualizacion.getTime() > this.TTL_MS) {
      this.store.delete(telefono);
      return null;
    }
    return entrada;
  }

  guardar(telefono: string, dto: ActualizarEstadoDto): void {
    this.store.set(telefono, {
      estado: dto.estado,
      datos: dto.datos,
      ultimaActualizacion: new Date(),
    });
    this.logger.debug(`Estado actualizado — ${telefono}: ${dto.estado}`);
  }

  eliminar(telefono: string): void {
    this.store.delete(telefono);
    this.logger.debug(`Estado eliminado — ${telefono}`);
  }

  private limpiarExpirados(): void {
    const ahora = Date.now();
    let eliminados = 0;
    for (const [telefono, entrada] of this.store.entries()) {
      if (ahora - entrada.ultimaActualizacion.getTime() > this.TTL_MS) {
        this.store.delete(telefono);
        eliminados++;
      }
    }
    if (eliminados > 0) this.logger.debug(`Limpieza: ${eliminados} conversación(es) expirada(s) eliminada(s)`);
  }
}
