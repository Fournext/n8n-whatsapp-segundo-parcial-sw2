import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { EstadoService, EntradaEstado } from './estado.service';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';
import { ApiKeyGuard } from '../compartido/guards/api-key.guard';

/**
 * Store en memoria de estados de conversación por número de teléfono.
 * n8n lo usa para leer/escribir el paso actual de cada paciente en el flujo.
 * Requiere header x-bridge-api-key.
 */
@Controller('estado')
@UseGuards(ApiKeyGuard)
export class EstadoController {
  constructor(private readonly estadoService: EstadoService) {}

  /**
   * Retorna el estado actual de la conversación para el número dado.
   * n8n recibe 404 cuando el paciente no tiene conversación activa (= estado INICIO).
   *
   * GET /estado/:telefono
   */
  @Get(':telefono')
  obtenerEstado(@Param('telefono') telefono: string): EntradaEstado {
    const estado = this.estadoService.obtener(telefono);
    if (!estado) throw new NotFoundException('Sin conversación activa');
    return estado;
  }

  /**
   * Crea o actualiza el estado de la conversación.
   *
   * PUT /estado/:telefono
   */
  @Put(':telefono')
  actualizarEstado(
    @Param('telefono') telefono: string,
    @Body() dto: ActualizarEstadoDto,
  ) {
    this.estadoService.guardar(telefono, dto);
    return { actualizado: true };
  }

  /**
   * Elimina el estado tras completar o cancelar una conversación.
   *
   * DELETE /estado/:telefono
   */
  @Delete(':telefono')
  @HttpCode(200)
  eliminarEstado(@Param('telefono') telefono: string) {
    this.estadoService.eliminar(telefono);
    return { eliminado: true };
  }
}
