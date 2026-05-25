# Callejeros — MVP en 2 semanas (Astro)

## Semana 1 — Cliente puede pedir

| Día | Entregable | Estado |
|-----|------------|--------|
| 1 | Proyecto Astro + menú en código + UI pedido (Plan B) | ✅ Base |
| 2 | Pulir UX móvil, PWA manifest, favicon lobo | |
| 3 | API `POST /api/orders` + Supabase (tablas `orders`, `order_lines`) | |
| 4 | Conectar formulario → guardar pedido real | |
| 5 | Pantalla confirmación con código desde servidor | |

## Semana 2 — Dueños reciben resumen

| Día | Entregable |
|-----|------------|
| 6 | Panel `/admin` (PIN) lista pedidos | ✅ |
| 7 | Estados: nuevo → en cocina → listo → entregado | ✅ |
| 8 | Notificación email o webhook (Resend / Make) por pedido nuevo |
| 9 | Botón “Resumen últimos 10” + copiar texto WhatsApp |
| 10 | Deploy Vercel + dominio + QR impreso |

## Stack acordado

- **Frontend:** Astro 6 + React (islas) + Tailwind 4
- **Backend:** Endpoints en `src/pages/api/` + Supabase Postgres
- **Auth dueños:** variable `ADMIN_PIN` (v1 simple)
- **Notificaciones:** Resend (email) → luego SMS/WhatsApp

## Comandos

```bash
npm run dev      # http://localhost:4321
npm run build
```

## Variables de entorno (próximo paso)

Copia `.env.example` a `.env` cuando crees el proyecto Supabase.
