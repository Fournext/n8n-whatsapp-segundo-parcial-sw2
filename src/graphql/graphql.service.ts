import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface PlanGym {
  id: number;
  nombre: string;
  duracionDias: number;
  precio: number;
  descripcion: string;
}

export interface SocioGym {
  id: number;
  ci: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  plan: string;
  fechaInicio: string;
  fechaVencimiento: string;
  diasRestantes: number;
  estado: 'ACTIVO' | 'POR_VENCER' | 'VENCIDO';
}

@Injectable()
export class GraphqlService {
  private readonly logger = new Logger(GraphqlService.name);

  // Catálogo base de planes del Gimnasio
  public readonly planesDisponibles: PlanGym[] = [
    { id: 1, nombre: 'Plan Mensual Estándar', duracionDias: 30, precio: 250, descripcion: 'Acceso total a máquinas y peso libre' },
    { id: 2, nombre: 'Plan Trimestral Black', duracionDias: 90, precio: 650, descripcion: 'Acceso máquinas + clases grupales + 1 sesión con entrenador' },
    { id: 3, nombre: 'Plan Anual VIP', duracionDias: 365, precio: 2200, descripcion: 'Acceso total 24/7 + Sauna + 2 pases de invitado por mes' },
  ];

  // Base en memoria para pruebas y demostraciones fluidas
  private sociosDemo: Map<string, SocioGym> = new Map([
    [
      '9876543',
      {
        id: 101,
        ci: '9876543',
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '59170123456',
        email: 'juan.perez@gmail.com',
        plan: 'Plan Trimestral Black',
        fechaInicio: '2026-08-01',
        fechaVencimiento: '2026-10-31',
        diasRestantes: 12,
        estado: 'POR_VENCER',
      },
    ],
    [
      '1234567',
      {
        id: 102,
        ci: '1234567',
        nombre: 'Carlos',
        apellido: 'Mendoza',
        telefono: '59178945612',
        email: 'carlos.mendoza@gmail.com',
        plan: 'Plan Mensual Estándar',
        fechaInicio: '2026-10-01',
        fechaVencimiento: '2026-10-21',
        diasRestantes: 2,
        estado: 'POR_VENCER',
      },
    ],
  ]);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get gatewayUrl() {
    return this.config.get<string>('GRAPHQL_GATEWAY_URL') || 'http://localhost:3000/graphql';
  }

  /** Ejecuta una consulta genérica a GraphQL con fallback tolerante a fallos */
  async ejecutar<T>(query: string, variables: any = {}): Promise<T | null> {
    try {
      const response = await firstValueFrom(
        this.http.post(
          this.gatewayUrl,
          { query, variables },
          { headers: { 'Content-Type': 'application/json' }, timeout: 3000 }
        )
      );

      const body = response.data;
      if (body.errors && body.errors.length > 0) {
        this.logger.warn(`GraphQL devolvió errores: ${JSON.stringify(body.errors)}`);
        return null;
      }
      return body.data as T;
    } catch (err) {
      this.logger.warn(`GraphQL Gateway no disponible (${err.message}). Usando fallback de datos locales del gimnasio.`);
      return null;
    }
  }

  /** Busca un socio por su número de Cédula de Identidad (CI) */
  async buscarSocioPorCI(ci: string): Promise<SocioGym | null> {
    const ciLimpio = ci.trim().toUpperCase();

    // 1. Intentar vía backend GraphQL si está disponible
    const query = `
      query BuscarSocio($ci: String!) {
        socioPorCI(ci: $ci) {
          id
          ci
          persona { nombre apellido email telefono }
          membresiaActual { plan { nombre } fechaInicio fechaFin estado }
        }
      }
    `;
    const resultado = await this.ejecutar<any>(query, { ci: ciLimpio });
    if (resultado?.socioPorCI) {
      const s = resultado.socioPorCI;
      const fFin = new Date(s.membresiaActual.fechaFin);
      const hoy = new Date();
      const diasRestantes = Math.max(0, Math.ceil((fFin.getTime() - hoy.getTime()) / (1000 * 3600 * 24)));
      return {
        id: s.id,
        ci: s.ci,
        nombre: s.persona.nombre,
        apellido: s.persona.apellido,
        telefono: s.persona.telefono,
        email: s.persona.email,
        plan: s.membresiaActual.plan.nombre,
        fechaInicio: s.membresiaActual.fechaInicio,
        fechaVencimiento: s.membresiaActual.fechaFin,
        diasRestantes,
        estado: diasRestantes <= 3 ? 'POR_VENCER' : 'ACTIVO',
      };
    }

    // 2. Si no hay respuesta del gateway, buscar en datos locales
    return this.sociosDemo.get(ciLimpio) || null;
  }

  /** Busca un socio por su número de teléfono */
  async buscarSocioPorTelefono(telefono: string): Promise<SocioGym | null> {
    const num = telefono.replace(/[^0-9]/g, '');
    for (const socio of this.sociosDemo.values()) {
      if (socio.telefono.includes(num) || num.includes(socio.telefono)) {
        return socio;
      }
    }
    return null;
  }

  /** Renueva la membresía de un socio agregando días de validez */
  async renovarMembresia(ci: string, planIndex: number): Promise<SocioGym> {
    const plan = this.planesDisponibles[planIndex] || this.planesDisponibles[0];
    let socio = await this.buscarSocioPorCI(ci);

    const nuevaFechaVenc = new Date();
    nuevaFechaVenc.setDate(nuevaFechaVenc.getDate() + plan.duracionDias);
    const fechaVencStr = nuevaFechaVenc.toISOString().split('T')[0];

    if (socio) {
      socio.plan = plan.nombre;
      socio.fechaVencimiento = fechaVencStr;
      socio.diasRestantes = plan.duracionDias;
      socio.estado = 'ACTIVO';
      this.sociosDemo.set(socio.ci, socio);
    } else {
      socio = {
        id: Date.now(),
        ci,
        nombre: 'Socio',
        apellido: 'Titán',
        telefono: '59170000000',
        email: 'socio@gym.com',
        plan: plan.nombre,
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaVencimiento: fechaVencStr,
        diasRestantes: plan.duracionDias,
        estado: 'ACTIVO',
      };
      this.sociosDemo.set(ci, socio);
    }

    this.logger.log(`Membresía renovada para CI ${ci}: ${plan.nombre} (Vence: ${fechaVencStr})`);
    return socio;
  }

  /** Devuelve lista de socios con membresías por vencer o vencidas para el job de notificaciones */
  obtenerSociosParaAviso(): SocioGym[] {
    return Array.from(this.sociosDemo.values()).filter(
      (s) => s.diasRestantes <= 5 || s.estado === 'POR_VENCER' || s.estado === 'VENCIDO'
    );
  }
}
