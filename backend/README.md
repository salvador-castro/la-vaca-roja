# La Vaca Roja — Backend (API)

API REST para **La Vaca Roja**, construida con Next.js. Centraliza el acceso a Supabase con la service role key, la integración con Mercado Pago, y la lógica de cupones, promociones y cálculo de zonas de envío. Es consumida por el panel de administración que vive en `../frontend` (`/dashboard`, rol Admin).

> Este directorio se bootstrapeó sobre el template **[TailAdmin Next.js](https://tailadmin.com)** (licencia MIT, ver [`LICENSE`](./LICENSE)). Las páginas de dashboard/gráficos/calendario/UI-kit que trae el template (`src/app/(admin)/(others-pages)`, `src/app/(admin)/(ui-elements)`) siguen mayormente con datos de demo y no están conectadas a Supabase — la gestión real del negocio ocurre desde el panel admin del frontend, que usa este proyecto solo como API.

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16.x | Framework (App Router, API routes) |
| [React](https://react.dev/) | 19.x | UI de las páginas heredadas del template |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Tipado |
| [Supabase JS](https://supabase.com/) | 2.x | Acceso a datos con la service role key |
| [@supabase/ssr](https://supabase.com/docs/guides/auth/server-side) | 0.10.x | Autenticación server-side |
| [Mercado Pago SDK](https://www.mercadopago.com.ar/developers/) | 2.x | Preferencias de pago, webhook y reintentos |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Estilos del template TailAdmin |
| [ApexCharts](https://apexcharts.com/) / [FullCalendar](https://fullcalendar.io/) | 4.x / 6.x | Componentes del template (dashboard demo, calendario) |
| [react-dnd](https://react-dnd.github.io/react-dnd/) | 16.x | Drag & Drop (template) |
| [@react-jvectormap](https://www.npmjs.com/package/@react-jvectormap/core) | 1.x | Mapa de distribución (template) |

## API — Endpoints

Todas las rutas viven bajo `src/app/api/` y responden con headers CORS dinámicos según `FRONTEND_URL` (ver `src/utils/supabase/api.ts`).

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/products` | GET, POST | Listado y alta de productos |
| `/api/products/[id]` | GET, PUT, DELETE | Detalle, edición y baja de un producto |
| `/api/orders` | GET, POST | Listado y creación de pedidos |
| `/api/orders/[id]` | GET, PUT | Detalle y actualización de estado de un pedido |
| `/api/coupons/validate` | POST | Valida un cupón (`code`, `subtotal`) sin incrementar su uso |
| `/api/promotions` | GET | Combos/promociones activas (público) |
| `/api/settings` | GET, POST | Configuración general del negocio |
| `/api/shipping/estimate` | GET | Resuelve la zona de envío por geocoding de la dirección del perfil autenticado |
| `/api/users` | GET, POST | Gestión de usuarios y roles |
| `/api/payment/create-preference` | POST | Crea la preferencia de pago en Mercado Pago |
| `/api/payment/webhook` | POST | Recibe notificaciones de pago de Mercado Pago |
| `/api/payment/retry` | POST | Reintenta el pago de una orden existente |

La autenticación de cada request se valida con `getAuthUser` / `requireAdmin` (`src/utils/supabase/api.ts`) a partir del JWT de Supabase enviado por el frontend.

## Estructura del proyecto

```
backend/
├── src/
│   ├── app/
│   │   ├── api/                    # Endpoints REST (ver tabla arriba)
│   │   ├── (admin)/                # Shell del template TailAdmin (mayormente demo, no conectado)
│   │   └── (full-width-pages)/     # Login/registro/errores del template
│   ├── components/                 # Componentes UI del template TailAdmin
│   ├── context/                    # Contextos del template (theme, sidebar)
│   ├── hooks/                      # Hooks del template
│   ├── layout/                     # Layout del dashboard TailAdmin
│   └── utils/
│       ├── supabase/               # Cliente admin, auth helpers, CORS
│       └── shipping.ts             # Resolución de zona de envío por geocoding
└── package.json
```

## Variables de entorno

Crear un archivo `.env.local` en la raíz de `/backend`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # Solo servidor. Nunca exponer al cliente ni commitear.
MP_ACCESS_TOKEN=              # Access token de Mercado Pago (test o producción)
FRONTEND_URL=                 # Origen permitido por CORS (ej. https://lavacaroja.com.ar)
BACKEND_PUBLIC_URL=           # URL pública de este backend, usada como callback del webhook de MP
```

## Instalación y desarrollo

```bash
npm install
npm run dev    # http://localhost:3000
```

### Comandos disponibles

```bash
npm run dev      # Dev server
npm run build    # Build de producción
npm run start    # Sirve el build de producción
npm run lint     # Linting con ESLint
```

## Licencia

El código propio de la API (`src/app/api/`, `src/utils/`) es de La Vaca Roja. El scaffolding UI heredado de TailAdmin se distribuye bajo licencia MIT — ver [`LICENSE`](./LICENSE).
