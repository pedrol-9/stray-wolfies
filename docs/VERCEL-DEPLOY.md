# Desplegar Stray-Wolfies en Vercel

## Error común

`npx plugins add vercel/vercel-plugin` **no** es la CLI de Vercel. Es un plugin para herramientas de IA (Cursor/Claude).

Usa la CLI oficial: **`npx vercel`** o **`vercel`**.

---

## 1. Iniciar sesión (una vez)

```powershell
cd c:\Users\USUARIO\OneDrive\Desktop\stray-wolfies
npx vercel login
```

Se abre el navegador para autorizar tu cuenta.

---

## 2. Enlazar con el proyecto que creaste en Vercel

Si ya importaste el repo `pedrol-9/stray-wolfies` en el dashboard:

```powershell
npx vercel link
```

Responde:

| Pregunta | Respuesta típica |
|----------|------------------|
| Set up and deploy? | **N** (solo enlazar) o **Y** si quieres deploy ahora |
| Which scope? | Tu usuario o equipo |
| Link to existing project? | **Y** |
| Project name | El nombre que ves en Vercel (ej. `stray-wolfies`) |

Esto crea la carpeta `.vercel/project.json` (ya está en `.gitignore`).

---

## 3. Variables de entorno en Vercel

En [vercel.com](https://vercel.com) → tu proyecto → **Settings** → **Environment Variables**, añade las mismas que en `.env.local`:

| Variable | Entorno |
|----------|---------|
| `PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview (secreta) |
| `ADMIN_PIN` | Production, Preview |
| `PUBLIC_OWNER_WHATSAPP` | Production (opcional) |
| `ORDER_WEBHOOK_URL` | Production (opcional) |

**No** subas `.env.local` a Git.

---

## 4. Desplegar

```powershell
# Preview (prueba)
npx vercel

# Producción
npx vercel --prod
```

O push a `main` si conectaste GitHub en Vercel (deploy automático).

---

## Adaptador

El proyecto usa `@astrojs/vercel` (SSR + rutas `/api/*`). El build local:

```powershell
npm run build
```

debe mostrar `adapter: @astrojs/vercel`.
