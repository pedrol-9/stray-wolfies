# WhatsApp — avisos de pedidos nuevos

Hay **tres niveles** (de más simple a automático total).

---

## 1. Panel admin (ya incluido) — gratis

Con `/admin` abierto en el celular o tablet de cocina:

- **Sonido** cuando entra un pedido nuevo (estado “por aceptar”).
- **Notificación del navegador** (si das permiso).
- Botón **“Enviar resumen por WhatsApp”** en cada pedido.

### Configurar número del dueño

En `.env.local`:

```env
PUBLIC_OWNER_WHATSAPP=573001234567
```

Solo dígitos con código de país (57 Colombia). Reinicia `npm run dev`.

El botón abre WhatsApp con el mensaje **ya escrito** para enviar a ese número (útil si el panel está en el mismo teléfono del negocio o de un ayudante).

---

## 2. Webhook → Make / Zapier → WhatsApp — recomendado para auto-envío

Cuando un cliente hace pedido, la API llama a una URL que tú configuras.

### En `.env.local`

```env
ORDER_WEBHOOK_URL=https://hook.eu1.make.com/xxxxxxxx
```

### Flujo en Make (ejemplo)

1. Módulo **Webhook** — recibe POST con JSON:
   - `event`: `order.placed`
   - `text`: resumen en texto plano
   - `code`, `customerName`, `customerPhone`, `total`, etc.
2. Módulo **WhatsApp Business Cloud** o **Twilio WhatsApp** — envía `text` al número del dueño.

Ventaja: el dueño recibe el mensaje **sin abrir el panel**.

Documentación: [Make](https://www.make.com/), [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api).

---

## 3. WhatsApp Business API (Meta) directo — más técnico

Para alto volumen y mensajes 24/7 sin depender de Make:

1. Cuenta **Meta Business**.
2. App en [developers.facebook.com](https://developers.facebook.com) → producto WhatsApp.
3. Número de teléfono verificado para el negocio.
4. Token de acceso + `phone_number_id`.
5. En el servidor, tras guardar el pedido, `POST` a:

   `https://graph.facebook.com/v21.0/{phone_number_id}/messages`

   con plantilla o mensaje de texto al `wa_id` del dueño.

Costo: conversaciones según tarifas de Meta (~centavos por mensaje según país).

---

## Comparación rápida

| Opción | Costo | Automático | Dificultad |
|--------|-------|------------|------------|
| Panel + sonido + botón | $0 | Semi (panel abierto) | ✅ Listo |
| Webhook + Make | ~$0–10/mes | Sí | Media |
| API Meta directa | Por mensaje | Sí | Alta |

---

## Resumen para Callejeros hoy

1. Pon `PUBLIC_OWNER_WHATSAPP` en `.env.local`.
2. Deja `/admin` abierto con sonido activado.
3. Cuando quieras WhatsApp **solo**, configura `ORDER_WEBHOOK_URL` en Make con WhatsApp.

No hace falta WhatsApp para que el negocio funcione; el panel + sonido cubre la cocina.
