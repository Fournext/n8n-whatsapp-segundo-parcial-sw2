# Bridge MS — Guía de Arranque para la Defensa

## ¿Por qué este microservicio existe?

Whapi ofrece 5 días gratis. La defensa del examen ocurre ~1 mes después de la presentación.
**Solución:** este microservicio y n8n self-hosted solo se levantan el día de la defensa.
n8n self-hosted es gratuito para siempre. El timer de Whapi empieza cuando registras la URL del webhook.

---

## Arquitectura

```
[Paciente WhatsApp]
       │
       ▼ webhook
[Whapi] ──► [ngrok:3003] ──► [Bridge MS :3003]
                                    │
                    reenvía evento  │
                                    ▼
                            [n8n self-hosted :5678]
                                    │
                   ┌────────────────┼────────────────┐
                   ▼                ▼                ▼
          [clinica :3000]   [Bridge /whatsapp]  [Bridge /email]
           /n8n/pacientes      /enviar             /enviar
           /n8n/citas
           /n8n/disponibilidad
```

---

## Pasos para el día de la defensa

### 1. Levantar n8n (Docker)

```powershell
# Copiar .env.example → .env y rellenar los valores
Copy-Item .env.example .env

# Levantar n8n
docker compose up -d

# Abrir n8n en el navegador
Start-Process "http://localhost:5678"
```

En n8n UI:
1. Ir a **Workflows → Import from file**
2. Importar `workflows/gimnasio-membresias-whatsapp.json` (o `workflows/primera-cita-whatsapp.json`)
3. Abrir el workflow → Activar el workflow (toggle arriba a la derecha)
4. El nuevo workflow de Gimnasio incluye:
   - **Gestión de Membresías y Renovaciones** por WhatsApp
   - **Consulta de Estado y Días Restantes**
   - **Cron Diario (8:00 AM)** para alertar vencimientos a los 3 días y el día de vencimiento
   - **Webhook de Difusión de Promociones** (`/webhook/gym-promociones`)

### 2. Levantar el Bridge MS

```powershell
pnpm start:prod
# o en modo dev:
pnpm start:dev
```

### 3. Exponer via ngrok

La URL de ngrok ya está fija en el plan gratuito: 

```powershell
ngrok http 3003 --domain=nasir-unsaveable-marcela.ngrok-free.dev
```

La URL pública es: `https://nasir-unsaveable-marcela.ngrok-free.dev`

### 4. Registrar el webhook en Whapi

1. Ir al panel de Whapi → **Settings → Webhooks**
2. URL del webhook: `https://nasir-unsaveable-marcela.ngrok-free.dev/webhook/whatsapp`
3. Eventos a suscribir: **messages**
4. Guardar

> ⚠️ El contador de 5 días de Whapi empieza **aquí**. No registrar antes de la defensa.

---

## Variables de entorno

Copiar `clinica-segundo-parcial-sw2/.env` y extraer:

| Variable | Descripción |
|---|---|
| `WHAPI_BASE_URL` | `https://gate.whapi.cloud` |
| `WHAPI_TOKEN` | Token de Whapi |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Correo Gmail |
| `SMTP_PASS` | App password de Gmail |
| `BRIDGE_API_KEY` | Clave inventada (debe coincidir con `N8N_API_KEY` del docker-compose) |
| `N8N_WEBHOOK_URL` | URL del webhook de n8n (paso 1) |

---

## Endpoints del Bridge MS

| Método | Ruta | Auth | Llamado por | Descripción |
|---|---|---|---|---|
| `POST` | `/webhook/whatsapp` | — | Whapi | Recibe eventos de WhatsApp, reenvía a n8n |
| `POST` | `/whatsapp/enviar` | `x-bridge-api-key` | n8n | Envía mensaje de WhatsApp al paciente via Whapi |
| `POST` | `/email/enviar` | `x-bridge-api-key` | n8n | Envía email de confirmación via SMTP |
| `GET` | `/estado/:telefono` | `x-bridge-api-key` | n8n | Obtiene estado de la conversación |
| `PUT` | `/estado/:telefono` | `x-bridge-api-key` | n8n | Actualiza estado de la conversación |
| `DELETE` | `/estado/:telefono` | `x-bridge-api-key` | n8n | Limpia el estado al completar o cancelar |

---

## Flujo de conversación implementado

```
Paciente: "Hola"
Bot:      Bienvenido → pedir nombre completo
Bot←     "Juan Pérez"
Bot:      Pedir CI
Bot←     "9876543"
Bot:      Pedir celular
Bot←     "70123456"
Bot:      Pedir email
Bot←     "juan@gmail.com"
Bot:      Pedir motivo de consulta
Bot←     "Dolor lumbar"
         → POST clinica/n8n/pacientes (registrar o recuperar paciente)
         → GET  clinica/n8n/disponibilidad (horarios de mañana)
Bot:      "Horarios disponibles: 1) 9:00 AM  2) 11:00 AM  ..."
Bot←     "2"
         → POST clinica/n8n/citas (agendar)
         → PATCH clinica/n8n/citas/:id/confirmar
Bot:      "🎉 Cita confirmada para mañana a las 11:00 AM"
         → POST bridge/email/enviar (confirmación al correo)
```

Comandos que reinician el flujo en cualquier momento:
`hola`, `inicio`, `nueva cita`, `cancelar`, `reiniciar`, `menu`

---

## Para detener todo después de la defensa

```powershell
docker compose down   # detiene n8n (los workflows quedan en el volumen)
# Ctrl+C en el terminal del bridge MS
# Ctrl+C en ngrok
```

Whapi se puede desactivar desde su panel para no consumir los días restantes.
