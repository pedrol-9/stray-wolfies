# Stray-Wolfies / Callejeros

Pedidos móviles para el negocio **Callejeros** — MVP con Astro + React.

## Empezar

```bash
npm install
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321).

## Estructura

- `src/data/menu.ts` — carta actual (precios en COP)
- `src/components/order/OrderApp.tsx` — flujo Plan B (menú → personalizar → carrito → checkout)
- `docs/MVP-ROADMAP.md` — plan de 2 semanas

## Próximo paso técnico

Conectar `POST /api/orders` a Supabase para persistir pedidos y avisar a los dueños.
