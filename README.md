# La Vaca Roja — Plataforma E-commerce & Admin

Plataforma fullstack para **La Vaca Roja**, carnicería con más de 20 años de trayectoria en Palermo, Buenos Aires. La solución integra una tienda online para clientes y un panel de administración completo para la gestión interna del negocio.

---

## Arquitectura del monorepo

```
la-vaca-roja/
├── frontend/    # Tienda online (React + Vite + Supabase)
└── backend/     # Panel de administración (Next.js + Tailwind CSS v4)
```

---

## Frontend — Tienda Online

**Stack:** React 19 · Vite · Supabase · React Router DOM v7 · Mercado Pago

### Funcionalidades

- **Hero** con estadísticas del negocio (20+ años, 15k clientes, 60+ cortes, rating 4.9★)
- **Catálogo de productos** con filtros por categoría y búsqueda en tiempo real
- **Promociones destacadas** (combos) con badges dinámicos (OFERTA / NUEVO / PREMIUM)
- **Descuentos bancarios** con cards por banco (Cuenta DNI, BBVA, Ualá)
- **Carrito lateral** (CartDrawer) con gestión de cantidades y persistencia de sesión
- **Checkout con Mercado Pago** — páginas de resultado para pago exitoso, pendiente y fallido
- **Autenticación completa** — registro, login y reset de contraseña vía Supabase Auth
- **Dashboard privado** para clientes autenticados
- **Exportación de reportes** en PDF (jsPDF) y Excel (xlsx)
- **Scroll reveal animations** y diseño responsive

### Páginas

| Ruta | Descripción |
|---|---|
| `/` | Home con hero, promos, descuentos bancarios y productos destacados |
| `/shop` | Catálogo completo con filtros y búsqueda |
| `/cart` | Carrito de compras |
| `/login` | Inicio de sesión |
| `/register` | Registro de cuenta |
| `/dashboard` | Dashboard privado (ruta protegida) |
| `/pago/exitoso` | Confirmación de pago exitoso |
| `/pago/pendiente` | Pago en proceso |
| `/pago/fallido` | Error en el pago |
| `/reset-password` | Recuperación de contraseña |

### Iniciar frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

---

## Backend — Panel de Administración

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase SSR · ApexCharts

### Funcionalidades

- **Dashboard con métricas** y gráficos en tiempo real (ApexCharts — líneas y barras)
- **Gestión de productos** — alta, edición, baja y upload de imágenes
- **Gestión de pedidos** con estados y seguimiento
- **Calendario de eventos** con FullCalendar (vistas día / semana / mes / lista)
- **Mapa de distribución** de clientes (react-jvectormap)
- **Drag & Drop** para reordenamiento de elementos (react-dnd)
- **Autenticación SSR** con `@supabase/ssr` y middleware de protección de rutas
- **Dark mode** nativo
- **Tablas de datos** con exportación

### Iniciar backend

```bash
cd backend
npm install
npm run dev    # http://localhost:3000
```

---

## Variables de entorno

### Frontend (`frontend/.env.local`)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MP_PUBLIC_KEY=        # Mercado Pago Public Key
```

### Backend (`backend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Stack completo

| Tecnología | Versión | Uso |
|---|---|---|
| [React](https://react.dev/) | 19.x | UI en frontend y backend |
| [Vite](https://vitejs.dev/) | 8.x | Bundler del frontend |
| [Next.js](https://nextjs.org/) | 16.x | Framework del panel admin |
| [Supabase](https://supabase.com/) | 2.x | Base de datos, Storage y Auth |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Estilos del panel admin |
| [Mercado Pago SDK](https://www.mercadopago.com.ar/developers/) | 2.x | Pasarela de pagos |
| [FullCalendar](https://fullcalendar.io/) | 6.x | Calendario en el admin |
| [ApexCharts](https://apexcharts.com/) | 4.x | Gráficos del dashboard |
| [jsPDF](https://github.com/parallax/jsPDF) | 4.x | Exportación PDF |
| [xlsx](https://github.com/SheetJS/sheetjs) | — | Exportación Excel |
| [react-dnd](https://react-dnd.github.io/react-dnd/) | 16.x | Drag & Drop |

---

## Deploy

El proyecto está deployado en **Vercel** con configuración separada por directorio.

```bash
# Frontend
cd frontend && npm run build

# Backend (admin)
cd backend && npm run build
```

---

## Información del negocio

| | |
|---|---|
| **Nombre** | La Vaca Roja |
| **Rubro** | Carnicería Premium |
| **Barrio** | Palermo, Buenos Aires, Argentina |
| **Trayectoria** | Desde 2004 |
| **Delivery** | CABA y GBA — mismo día (pedidos antes de las 14hs) |

---

## Licencia

© 2026 La Vaca Roja · Todos los derechos reservados.
