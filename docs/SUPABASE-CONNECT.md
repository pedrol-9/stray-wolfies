# Conectar Supabase con el proyecto local

## Antes de crear el proyecto (tu pantalla)

En el formulario de Supabase:

| Opción | Recomendación |
|--------|----------------|
| **Project name** | `Stray-Wolfies` ✅ |
| **Database password** | Fuerte — guárdala en un gestor de contraseñas |
| **Region** | Americas ✅ |
| **Enable Data API** | ✅ Dejar activado |
| **Automatically expose new tables** | ✅ Puede quedar activado |
| **Enable automatic RLS** | Opcional; el SQL del repo activa RLS en tablas clave |

Pulsa **Create new project** y espera 1–2 minutos.

---

## Paso 1 — Copiar las claves del proyecto

1. En Supabase: **Project Settings** (engranaje) → **API**.
2. Copia:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** → `PUBLIC_SUPABASE_ANON_KEY` (por si luego la usas en cliente)
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**, solo en servidor / `.env`)

> La `service_role` bypass RLS. Nunca la pongas en código del navegador ni en GitHub.

---

## Paso 2 — Crear tablas en Supabase

1. **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este repo, copia todo y **Run**.
3. Debe quedar la fila `shop_settings` con `is_open = false` (cerrado hasta que abran en `/admin`).

---

## Paso 3 — Archivo `.env.local` local

El asistente de Supabase sugiere `SUPABASE_URL` y `SUPABASE_KEY` (publishable).
Este proyecto también los acepta, pero **necesitas además** la clave **service_role** para pedidos.

Edita `.env.local` en la raíz (ya está en `.gitignore`):

```env
PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # ← API → service_role (secreta)

ADMIN_PIN=1234
```

Puedes usar `SUPABASE_URL` / `SUPABASE_KEY` en lugar de los `PUBLIC_*` si prefieres los nombres del dashboard.

Elige un **PIN** que solo conozcan los dueños (para `/admin`).

---

## Paso 4 — Probar en local

```bash
npm run dev
```

| URL | Qué probar |
|-----|------------|
| http://localhost:4321/admin | PIN → **Abrir tienda** |
| http://localhost:4321 | Hacer un pedido de prueba |
| Supabase → **Table Editor** → `orders` | Debe aparecer el pedido |

Si la tienda está cerrada, el formulario muestra aviso y no envía.

---

## Paso 5 — Verificar la API

Con la tienda abierta, en PowerShell:

```powershell
Invoke-RestMethod http://localhost:4321/api/shop-status
```

Debe devolver `"isOpen": true` después de abrir en admin.

---

## Errores frecuentes

| Error | Solución |
|-------|----------|
| `Faltan PUBLIC_SUPABASE_URL...` | Revisa `.env` y reinicia `npm run dev` |
| `La tienda está cerrada` | Abre en `/admin` |
| 401 en admin | `ADMIN_PIN` en `.env` debe coincidir con el que escribes |
| Tabla no existe | Vuelve a ejecutar `supabase/schema.sql` |

---

## Siguiente (semana 2)

- Email al dueño con Resend cuando llegue un pedido
- Lista de pedidos en `/admin`
- Deploy en Vercel con las mismas variables de entorno
