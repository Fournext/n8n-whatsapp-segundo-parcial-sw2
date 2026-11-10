import { Injectable, Logger } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EstadoService } from '../estado/estado.service';
import { GraphqlService } from '../graphql/graphql.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly estadoService: EstadoService,
    private readonly graphqlService: GraphqlService,
    private readonly emailService: EmailService,
  ) {}

  async procesarMensaje(telefono: string, texto: string): Promise<void> {
    const textoTrim = texto.trim();
    const textoLower = textoTrim.toLowerCase();
    const estadoActual = this.estadoService.obtener(telefono);
    let estado = estadoActual ? estadoActual.estado : 'INICIO';
    let datos = estadoActual ? { ...estadoActual.datos } : {};

    // ─── Comandos Rápidos Globales ──────────────────────────────────────────
    if (['menu', 'inicio', 'hola', 'buenas', 'hi', 'start', 'reiniciar', 'cancelar'].includes(textoLower)) {
      this.estadoService.eliminar(telefono);
      await this.mostrarMenuPrincipal(telefono);
      this.estadoService.guardar(telefono, { estado: 'MENU_SELECCION', datos: {} });
      return;
    }

    if (['estado', 'mi plan', 'membresia', 'vencimiento'].includes(textoLower)) {
      await this.whatsappService.enviarTexto(
        telefono,
        '📋 *Consulta de Membresía*\nPor favor, ingresa tu número de *Carnet de Identidad (CI)*:'
      );
      this.estadoService.guardar(telefono, { estado: 'ESPERANDO_CI_ESTADO', datos: {} });
      return;
    }

    if (['renovar', 'renovacion', 'pagar', 'planes'].includes(textoLower)) {
      await this.mostrarCatalogoPlanes(telefono);
      this.estadoService.guardar(telefono, { estado: 'SELECCIONANDO_PLAN', datos: {} });
      return;
    }

    if (['promociones', 'promos', 'ofertas', 'descuentos'].includes(textoLower)) {
      await this.mostrarPromociones(telefono);
      return;
    }

    // ─── Máquina de Estados de Gimnasio ─────────────────────────────────────
    try {
      switch (estado) {
        case 'INICIO':
        case 'MENU_SELECCION':
          await this.manejarSeleccionMenu(telefono, textoTrim, datos);
          break;

        case 'ESPERANDO_CI_ESTADO':
          await this.manejarConsultaEstado(telefono, textoTrim, datos);
          break;

        case 'SELECCIONANDO_PLAN':
          await this.manejarSeleccionPlan(telefono, textoTrim, datos);
          break;

        case 'CONFIRMAR_RENOVACION':
          await this.manejarConfirmacionRenovacion(telefono, textoTrim, datos);
          break;

        case 'REGISTRO_NOMBRE':
          datos.nombre = textoTrim;
          await this.whatsappService.enviarTexto(telefono, `¡Excelente, ${datos.nombre}! Ahora ingresa tus *Apellidos*:`);
          this.estadoService.guardar(telefono, { estado: 'REGISTRO_APELLIDO', datos });
          break;

        case 'REGISTRO_APELLIDO':
          datos.apellido = textoTrim;
          await this.whatsappService.enviarTexto(telefono, 'Ingresa tu número de *Cédula de Identidad (CI)*:');
          this.estadoService.guardar(telefono, { estado: 'REGISTRO_CI', datos });
          break;

        case 'REGISTRO_CI':
          datos.ci = textoTrim;
          await this.whatsappService.enviarTexto(telefono, 'Ingresa tu *Correo Electrónico* para enviarte tu comprobante y accesos:');
          this.estadoService.guardar(telefono, { estado: 'REGISTRO_EMAIL', datos });
          break;

        case 'REGISTRO_EMAIL':
          datos.email = textoTrim;
          await this.whatsappService.enviarTexto(telefono, '✅ ¡Datos registrados con éxito!\nAhora elige tu plan inicial:');
          await this.mostrarCatalogoPlanes(telefono);
          this.estadoService.guardar(telefono, { estado: 'SELECCIONANDO_PLAN', datos });
          break;

        default:
          await this.mostrarMenuPrincipal(telefono);
          this.estadoService.guardar(telefono, { estado: 'MENU_SELECCION', datos: {} });
          break;
      }
    } catch (err) {
      this.logger.error(`Error en máquina de estados de gimnasio: ${err?.message}`);
      await this.whatsappService.enviarTexto(
        telefono,
        '⚠️ Ocurrió un inconveniente al procesar tu solicitud. Escribe *Menu* para volver a empezar.'
      );
      this.estadoService.eliminar(telefono);
    }
  }

  // ─── Métodos Auxiliares del Gimnasio ──────────────────────────────────────

  private async mostrarMenuPrincipal(telefono: string): Promise<void> {
    const menu = `🏋️‍♂️ *¡Bienvenido a Titan Gym & Fitness!* 🥊\n_Tu transformación comienza hoy._\n\n¿En qué podemos ayudarte?\n\n*1)* 📋 Consultar Estado de Membresía\n*2)* 💳 Renovar Membresía\n*3)* 🔥 Ver Promociones del Mes\n*4)* ⏰ Horarios y Ubicación\n*5)* 👤 Registrarme como Nuevo Socio\n\n_Escribe el *número* de tu opción o escribe tu *CI*:_`;
    await this.whatsappService.enviarTexto(telefono, menu);
  }

  private async mostrarCatalogoPlanes(telefono: string): Promise<void> {
    const planes = this.graphqlService.planesDisponibles;
    let mensaje = `💳 *Planes de Membresía Titan Gym* 💳\nElige el plan ideal para tus objetivos:\n\n`;
    planes.forEach((p, idx) => {
      mensaje += `*${idx + 1})* *${p.nombre}*\n   💵 Inversión: *Bs. ${p.precio}* (${p.duracionDias} días)\n   ✨ ${p.descripcion}\n\n`;
    });
    mensaje += `_Responde con el número (*1, 2 o 3*) del plan que deseas activar o renovar:_`;
    await this.whatsappService.enviarTexto(telefono, mensaje);
  }

  private async mostrarPromociones(telefono: string): Promise<void> {
    const promos = `🔥 *Promociones Exclusivas del Mes en Titan Gym* 🔥\n\n` +
      `💥 *2x1 para Amigos:* Inscríbete con un amigo en el Plan Mensual y el segundo paga el 50%.\n\n` +
      `⚡ *Renovación Anticipada:* Renueva tu membresía antes de que venza y obtén *15% de descuento* o *7 días adicionales gratis*.\n\n` +
      `🥊 *Plan Anual VIP:* Incluye acceso 24/7, área de Sauna, 1 toalla por visita y 2 pases de invitado mensuales.\n\n` +
      `_¿Deseas activar una promoción? Escribe *Renovar* o *2* para elegir tu plan._`;
    await this.whatsappService.enviarTexto(telefono, promos);
  }

  private async manejarSeleccionMenu(telefono: string, opcion: string, datos: any): Promise<void> {
    // Si escribió un CI directamente (más de 4 dígitos)
    if (/^\d{5,9}$/.test(opcion)) {
      await this.manejarConsultaEstado(telefono, opcion, datos);
      return;
    }

    switch (opcion) {
      case '1':
        await this.whatsappService.enviarTexto(
          telefono,
          '📋 *Consulta de Estado de Membresía*\nPor favor, ingresa tu número de *Carnet de Identidad (CI)*:'
        );
        this.estadoService.guardar(telefono, { estado: 'ESPERANDO_CI_ESTADO', datos });
        break;

      case '2':
        await this.mostrarCatalogoPlanes(telefono);
        this.estadoService.guardar(telefono, { estado: 'SELECCIONANDO_PLAN', datos });
        break;

      case '3':
        await this.mostrarPromociones(telefono);
        break;

      case '4':
        const info = `📍 *Ubicación y Horarios — Titan Gym*\n\n` +
          `🏢 Av. Principal #1024, Edificio Spartan, Piso 2\n` +
          `⏰ *Lunes a Viernes:* 06:00 a 22:00\n` +
          `⏰ *Sábados:* 08:00 a 18:00\n` +
          `⏰ *Domingos:* 09:00 a 14:00 (Área libre y cardio)\n\n` +
          `_Escribe *Menu* para ver las opciones disponibles._`;
        await this.whatsappService.enviarTexto(telefono, info);
        break;

      case '5':
        await this.whatsappService.enviarTexto(
          telefono,
          '👤 *Registro de Nuevo Socio*\n¡Genial! Comencemos por tu *Nombre*:'
        );
        this.estadoService.guardar(telefono, { estado: 'REGISTRO_NOMBRE', datos: {} });
        break;

      default:
        await this.whatsappService.enviarTexto(
          telefono,
          'Por favor escribe un número válido del *1 al 5*, o escribe *Menu* para reiniciar.'
        );
        break;
    }
  }

  private async manejarConsultaEstado(telefono: string, ci: string, datos: any): Promise<void> {
    const socio = await this.graphqlService.buscarSocioPorCI(ci);

    if (!socio) {
      await this.whatsappService.enviarTexto(
        telefono,
        `❌ No encontramos ningún socio con el CI *${ci}*.\n\n¿Deseas registrarte como nuevo socio? Responde *5* o escribe *Menu* para volver.`
      );
      this.estadoService.guardar(telefono, { estado: 'MENU_SELECCION', datos });
      return;
    }

    const iconoEstado = socio.diasRestantes > 3 ? '🟢' : socio.diasRestantes > 0 ? '🟡' : '🔴';
    const alertaVencimiento =
      socio.diasRestantes <= 3 && socio.diasRestantes > 0
        ? `\n⚠️ *¡Atención! Tu membresía vence en ${socio.diasRestantes} día(s).* Renueva a tiempo para no perder tu acceso.`
        : socio.diasRestantes === 0
        ? `\n🚨 *Tu membresía ha vencido.* Tu acceso por torno se encuentra suspendido.`
        : `\n✨ ¡Tu membresía está al día! Sigue entrenando duro.`;

    const mensajeEstado =
      `📋 *Estado de Membresía — Titan Gym*\n\n` +
      `👤 *Socio:* ${socio.nombre} ${socio.apellido}\n` +
      `🪪 *CI:* ${socio.ci}\n` +
      `🏋️‍♂️ *Plan Actual:* ${socio.plan}\n` +
      `📅 *Fecha de Vencimiento:* ${socio.fechaVencimiento}\n` +
      `⏳ *Días Restantes:* ${socio.diasRestantes} día(s) ${iconoEstado}\n` +
      alertaVencimiento +
      `\n\n¿Deseas renovar tu membresía ahora mismo?\n` +
      `👉 Escribe *1* para *Renovar Ahora*\n` +
      `👉 Escribe *Menu* para volver`;

    datos.socio = socio;
    await this.whatsappService.enviarTexto(telefono, mensajeEstado);
    this.estadoService.guardar(telefono, { estado: 'CONFIRMAR_ACCION_ESTADO', datos });
  }

  private async manejarSeleccionPlan(telefono: string, opcion: string, datos: any): Promise<void> {
    const indice = parseInt(opcion, 10) - 1;
    const planes = this.graphqlService.planesDisponibles;

    if (isNaN(indice) || indice < 0 || indice >= planes.length) {
      await this.whatsappService.enviarTexto(
        telefono,
        `Por favor elige una opción válida (*1*, *2* o *3*):`
      );
      return;
    }

    const planSeleccionado = planes[indice];
    datos.planSeleccionado = planSeleccionado;

    const ciSocio = datos.socio?.ci || datos.ci || '';

    const resumen =
      `🧾 *Resumen de Renovación — Titan Gym*\n\n` +
      `🏋️‍♂️ *Plan:* ${planSeleccionado.nombre}\n` +
      `⏳ *Duración:* ${planSeleccionado.duracionDias} días\n` +
      `💵 *Total a Pagar:* Bs. ${planSeleccionado.precio}\n\n` +
      `Métodos de pago disponibles:\n` +
      `1) Pago Rápido por Código QR / Transferencia Bancaria\n` +
      `2) Pago en Recepción (Efectivo / Tarjeta)\n\n` +
      `Responde *SI* para confirmar tu solicitud de renovación o *Cancelar* para volver.`;

    await this.whatsappService.enviarTexto(telefono, resumen);
    this.estadoService.guardar(telefono, { estado: 'CONFIRMAR_RENOVACION', datos });
  }

  private async manejarConfirmacionRenovacion(telefono: string, respuesta: string, datos: any): Promise<void> {
    const respLower = respuesta.toLowerCase();

    if (['si', 'sí', 'confirmar', 'ok', '1'].includes(respLower)) {
      const plan = datos.planSeleccionado || this.graphqlService.planesDisponibles[0];
      const ci = datos.socio?.ci || datos.ci || '9876543';
      const nombre = datos.socio?.nombre || datos.nombre || 'Socio';
      const email = datos.socio?.email || datos.email || 'socio@gym.com';

      // Actualizar en base de datos de gimnasio
      const socioActualizado = await this.graphqlService.renovarMembresia(ci, plan.id - 1);

      // Mensaje de éxito por WhatsApp
      const mensajeExito =
        `🎉 *¡Renovación Exitosa en Titan Gym!* 🏋️‍♂️\n\n` +
        `Hola *${nombre}*, tu membresía ha sido extendida:\n` +
        `⭐ *Plan Activo:* ${plan.nombre}\n` +
        `📅 *Nueva Fecha de Vencimiento:* ${socioActualizado.fechaVencimiento}\n` +
        `✅ *Acceso Habilitado:* Tornos biométricos y App móvil activos.\n\n` +
        `Te enviamos el comprobante digital a tu correo *${email}*.\n\n` +
        `¡Nos vemos en el gimnasio a darlo todo! 💪🔥`;

      await this.whatsappService.enviarTexto(telefono, mensajeExito);

      // Enviar confirmación por correo electrónico vía SMTP
      try {
        await this.emailService.enviarConfirmacion({
          para: email,
          asunto: `Confirmación de Renovación de Membresía — ${plan.nombre}`,
          nombre,
          tipo: 'CONFIRMACION_RENOVACION',
          plan: plan.nombre,
          fechaVencimiento: socioActualizado.fechaVencimiento,
          diasRestantes: plan.duracionDias,
          monto: `Bs. ${plan.precio}`,
          mensaje: `Tu renovación del ${plan.nombre} ha sido procesada exitosamente. Tu acceso se encuentra habilitado hasta el ${socioActualizado.fechaVencimiento}.`,
        });
      } catch (e) {
        this.logger.warn(`No se pudo enviar email de confirmación: ${e?.message}`);
      }

      this.estadoService.eliminar(telefono);
    } else {
      await this.whatsappService.enviarTexto(
        telefono,
        'Renovación cancelada. Puedes escribir *Menu* cuando quieras volver a intentarlo.'
      );
      this.estadoService.eliminar(telefono);
    }
  }
}
