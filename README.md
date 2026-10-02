# La Vaca Roja — Plataforma E-commerce & Admin

Plataforma fullstack para **La Vaca Roja**, carnicería con más de 20 años de trayectoria en CABA (Gascón 801). Incluye:

- una **tienda online** para clientes (catálogo, combos, carrito, checkout con Mercado Pago o transferencia, delivery por zonas dentro de CABA),
- un **panel de administración embebido en la misma tienda** (`/dashboard` con rol admin),
- un **panel de cliente** (pedidos, reintento de pago, cancelación, perfil con dirección),
- una **API REST en Next.js** que centraliza la lógica sensible: creación de pedidos y cálculo de totales, envíos, preferencias y webhook de Mercado Pago, settings, usuarios y productos.

Todo comparte un único proyecto de **Supabase** (Postgres + Auth + Storage).

---

## Índice

1. [Arquitectura](#arquitectura)
2. [Modelo de acceso a datos](#modelo-de-acceso-a-datos)
3. [Frontend — Tienda](#frontend--tienda)
4. [Frontend — Panel de cliente](#frontend--panel-de-cliente)
5. [Frontend — Panel de administración](#frontend--panel-de-administración)
6. [Backend — API REST](#backend--api-rest)
7. [Reglas de negocio](#reglas-de-negocio)
8. [Base de datos (Supabase)](#base-de-datos-supabase)
9. [Variables de entorno](#variables-de-entorno)
10. [Desarrollo local](#desarrollo-local)
11. [Deploy](#deploy)
12. [Stack completo](#stack-completo)
13. [Deuda técnica y problemas conocidos](#deuda-técnica-y-problemas-conocidos)
14. [Información del negocio](#información-del-negocio)

---

## Arquitectura

```
laVacaRoja/
├── frontend/              # SPA React + Vite: tienda + panel cliente + panel admin
│   ├── public/images/     # Logo e imágenes estáticas de productos
│   ├── src/
│   │   ├── App.jsx        # Router + providers (Auth, Cart) + layout global
│   │   ├── context/       # AuthContext (sesión, perfil, rol, idle logout) · CartContext (carrito en localStorage)
│   │   ├── components/    # Navbar, Footer, CartDrawer, ProductCard, ProductModal, ShippingTopBar, WhatsAppFloat, PrivateRoute, ScrollToTop
│   │   ├── hooks/         # useProducts (GET /api/products)
│   │   ├── lib/           # Cliente Supabase (anon/publishable key)
│   │   ├── pages/         # Home, Shop, Cart, Login, Register, ResetPassword, Payment*, TransferConfirmation, Dashboard
│   │   │   ├── admin/     # AdminLayout + 8 vistas de gestión
│   │   │   └── client/    # ClientDashboard
│   │   └── index.css      # Estilos globales (CSS plano, ~3000 líneas, sin Tailwind)
│   ├── vercel.json        # Rewrite SPA → /index.html
│   └── test.js            # Script suelto de prueba (ver Deuda técnica)
├── backend/               # Next.js 16 (App Router) sobre el template TailAdmin
│   ├── src/app/api/       # ← Lo que realmente usa el negocio
│   ├── src/utils/         # supabase/{api,client,server}.ts · shipping.ts (geocoding + zonas)
│   ├── src/middleware.ts  # Refresh de sesión Supabase + CORS para /api/*
│   ├── src/app/(admin)/…  # Páginas del template TailAdmin (datos demo, no conectadas)
│   └── vercel.json        # framework: nextjs
├── .mcp.json.example      # Plantilla del MCP de Mercado Pago (test / prod)
└── vercel.json            # Vacío ({}), cada subcarpeta se deploya por separado
```

```
┌───────────────────────┐   supabase-js (publishable key + JWT del usuario, sujeto a RLS)   ┌──────────────┐
│ frontend (Vite SPA)   │ ─────────────────────────────────────────────────────────────────▶ │              │
│ lavacaroja.com.ar     │                                                                    │   Supabase   │
│                       │   fetch + Authorization: Bearer <access_token>                     │  Postgres    │
│                       │ ─────────────────▶ ┌──────────────────────┐ ─────────────────────▶ │  Auth        │
└───────────────────────┘                    │ backend (Next.js API)│                        │  Storage     │
            ▲                                │ /api/*               │ ── service role ─────▶ │              │
            │ back_urls                      └──────────┬───────────┘    (solo webhook)      └──────────────┘
            │                                           │ preferencias / consulta de pagos
            │                                           ▼
            └──────────────────────────────── Mercado Pago (Checkout Pro) ── webhook ──▶ /api/payment/webhook
                                                        
                                             Nominatim / OpenStreetMap ◀── geocoding (backend: zona de envío,
                                                                            frontend: autocompletado de dirección)
```

Ambos proyectos son independientes: cada uno tiene su `package.json`, su `node_modules`, su `.env.local` y su proyecto en Vercel. Se comunican por HTTP usando `VITE_API_URL`.

> **Importante:** el panel de administración real **no** es el de `backend/`. El backend se bootstrapeó con el template **TailAdmin Next.js** y sus páginas (`/`, `/calendar`, `/profile`, `/form-elements`, `/basic-tables`, `/line-chart`, `/bar-chart`, `/alerts`, `/avatars`, `/badge`, `/buttons`, `/images`, `/modals`, `/videos`, `/signin`, `/signup`, `/error-404`, `/blank`) siguen con datos demo. La gestión del negocio ocurre en `frontend/` → `/dashboard`.

---

## Modelo de acceso a datos

El frontend usa un **modelo híbrido**: algunas operaciones pasan por la API del backend y otras van directo a Supabase con el JWT del usuario (y por lo tanto dependen de las **políticas RLS** de cada tabla).

| Recurso | Lectura | Escritura |
|---|---|---|
| Productos (catálogo tienda) | API `GET /api/products` | — |
| Productos (admin CRUD individual) | Supabase directo | API `POST /api/products`, `PUT/DELETE /api/products/[id]` |
| Productos (import Excel, edición masiva, descuentos, combos) | Supabase directo | **Supabase directo** |
| Combos destacados (Home) / categorías del Navbar | Supabase directo | — |
| Categorías | Supabase directo | Supabase directo (+ renombre en cascada sobre `products.category`) |
| Cupones (admin) | Supabase directo | Supabase directo |
| Cupones (aplicar en carrito) | **Supabase directo** (validación en el cliente) | Incremento de `uses_count` en la API al crear la orden |
| Pedidos (cliente) | Supabase directo | API `POST /api/payment/create-preference`, `PATCH /api/orders/[id]`, `POST /api/payment/retry` |
| Pedidos (admin) | API `GET /api/orders` | API `PATCH /api/orders/[id]` |
| Usuarios (admin) | Supabase directo | Nombre/teléfono: Supabase directo · Rol: API `PATCH /api/users` |
| Perfil propio | Supabase directo | Supabase directo (+ `auth.updateUser` si cambia el email) |
| Settings | API `GET /api/settings` (público) | API `PATCH /api/settings` |
| Imágenes de productos/combos | — | Supabase Storage, bucket `productos` |
| Resumen admin | API `/api/orders` + `/api/users` + Supabase `products` | — |

Del lado backend, todas las rutas usan `createApiClient(req)`: un cliente Supabase con la **publishable key + el JWT del request**, por lo que también respetan RLS. La **service role key** sólo se usa en el webhook de Mercado Pago (que no tiene usuario autenticado). `createAdminClient()` existe en `utils/supabase/api.ts` pero no se usa.

---

## Frontend — Tienda

**Stack:** React 19 · Vite 8 · React Router DOM 7 · Supabase JS 2 · lucide-react · @vercel/analytics · CSS plano (`src/index.css`) · Google Fonts (Outfit + Inter).

### Rutas

| Ruta | Componente | Acceso | Descripción |
|---|---|---|---|
| `/` | `Home` | Público | Hero, banner de envío gratis, combos destacados, descuentos bancarios, productos destacados, "Por qué elegirnos" |
| `/shop` | `Shop` | Público | Catálogo completo con búsqueda y filtro por categoría (`?cat=<categoría>`) |
| `/cart` | `Cart` | Público (checkout requiere login) | Carrito, método de entrega, método de pago, resumen y checkout |
| `/login` | `Login` | Público | Login con email/contraseña; redirige a la ruta original o a `/dashboard` |
| `/register` | `Register` | Público | Alta de cuenta (nombre completo, email, contraseña) |
| `/reset-password` | `ResetPassword` | Link de recuperación | Define nueva contraseña (evento `PASSWORD_RECOVERY` de Supabase) |
| `/dashboard` | `Dashboard` | Privado (`PrivateRoute`) | `AdminLayout` si `profile.role === "admin"`, si no `ClientDashboard` |
| `/pago/exitoso` | `PaymentSuccess` | Back URL MP | Vacía el carrito y muestra el `external_reference` (nº de pedido) |
| `/pago/pendiente` | `PaymentPending` | Back URL MP | Pago en proceso |
| `/pago/fallido` | `PaymentFailure` | Back URL MP | Pago rechazado / cancelado |
| `/transferencia/:orderId` | `TransferConfirmation` | Tras checkout por transferencia | Alias y titular (desde settings), botón copiar alias y link a WhatsApp con el nº de pedido para mandar el comprobante |

Layout global (en todas las rutas): `ShippingTopBar` (marquee de promo, oculto en el admin) · `Navbar` · `CartDrawer` · `Footer` · `WhatsAppFloat` · `ScrollToTop` · `<Analytics />` de Vercel.

### Funcionalidades

- **Home**
  - Hero con estadísticas fijas (20+ años, 15k clientes, 60+ cortes, 4.9★).
  - **Combos destacados**: productos con `is_combo = true`, leídos directo de Supabase, con badge `promo` → OFERTA, `new` → NUEVO, otro → PREMIUM.
  - **Descuentos bancarios** (hardcodeados en `Home.jsx`): Cuenta DNI 20% (tope $5.000/mes, lun–vie), BBVA 30% (tope $12.000/mes, martes), Ualá 35% (tope $20.000/mes, todos los días). Logos desde el bucket `logosBancos`.
  - **Productos destacados**: hasta 8 productos con `featured = true`.
  - Animaciones de entrada con `IntersectionObserver` (clase `.reveal`).
- **Catálogo (`/shop`)**: productos activos vía `GET /api/products` (hook `useProducts`), búsqueda por nombre/categoría y pills de categoría generadas a partir de los productos.
- **Navbar**: dropdown "Tienda" con las categorías de productos activos (leídas de Supabase, ordenadas alfabéticamente), versión mobile con menú desplegable, contador del carrito.
- **ProductCard / ProductModal**
  - Productos por **kg** con selector de cantidad en pasos de 0,5 kg; resto por unidad (`unit`: pack, bife, pollo, etc.).
  - **Variantes** (`product_variants`), p. ej. "Por bife - Medio", "1 kg - Grueso" (grosores: Fino / Medio / Grueso).
  - **Precio promocional** si `sale_price` está seteado y la fecha actual está dentro de `promo_starts_at`–`promo_ends_at`; se muestra el precio anterior tachado.
  - **Precio sin impuestos nacionales** (Ley 27.743 de transparencia fiscal): `precio / 1,105` (IVA 10,5% de la carne). _Cambio aún sin commitear._
- **Carrito (`CartContext` + `CartDrawer`)**
  - Persistido en `localStorage` (clave `lvr_cart`, incluye ítems y cupón); se vacía al cerrar sesión.
  - Clave por ítem `productId-variante`, así el mismo producto puede estar en varias variantes.
  - El precio se congela al agregar (promo vigente o precio normal).
  - **Cupones**: se aplican desde el drawer (requiere usuario logueado). La validación (activo, vencimiento, límite de usos, compra mínima) se hace **en el cliente** contra Supabase.
- **Checkout (`/cart`)**
  - **Entrega**: _Delivery_ (default) o _Retiro en local_.
  - Con delivery, el front llama a `GET /api/shipping/estimate`, que geocodifica la dirección del perfil y devuelve la zona (1–3 km, 3–5 km, 5–10 km). Sin dirección o fuera de zona, no se puede finalizar (link a completarla en el perfil).
  - **Pago**: _Mercado Pago_ o _Transferencia_ (con % de descuento configurable y aviso de que el pedido se prepara una vez acreditado el pago; se muestran alias y titular).
  - Notas opcionales del pedido.
  - El resumen recalcula en vivo cupón → descuento transferencia → envío (gratis si supera el mínimo) → total, con los valores de `GET /api/settings`.
  - `POST /api/payment/create-preference`:
    - Mercado Pago → redirige a `init_point` (o `sandbox_init_point` si `import.meta.env.DEV` o `VITE_MP_SANDBOX=true`).
    - Transferencia → vacía el carrito y navega a `/transferencia/:orderId`.
- **Autenticación (`AuthContext`)**
  - Supabase Auth con email/contraseña; `full_name` se envía como metadata en el signup (el perfil en `profiles` lo crea un trigger del lado de Supabase).
  - Detecta registro duplicado (`identities.length === 0`).
  - **Cierre de sesión automático por inactividad a los 30 minutos** (mousemove, keydown, scroll, touch…).
  - La recuperación de contraseña se dispara desde el panel admin (Usuarios → enviar reset); no hay "olvidé mi contraseña" en el login.
- **WhatsApp flotante** → `wa.me/5491166874595`.
- **Footer**: dirección, horarios, redes (Instagram / Facebook) y crédito al desarrollador. Los links legales (Términos, Privacidad, Medios de pago, Envíos, Contacto) apuntan a `#`.

---

## Frontend — Panel de cliente

`ClientDashboard` (en `/dashboard` para usuarios con rol `cliente`), con dos pestañas:

- **Mis pedidos**: lista leída directo de Supabase (`orders` + `order_items`) con estado, detalle, totales y contadores. Acciones:
  - **Reintentar pago** (pedidos `pending`) → `POST /api/payment/retry` → redirige a Mercado Pago.
  - **Cancelar pedido** → `PATCH /api/orders/:id` con `status: "cancelled"`. La UI ofrece el botón en `pending`, `confirmed` y `preparing`, pero el backend **sólo lo acepta en `pending`** (ver Deuda técnica).
- **Mi perfil**: nombre, email, teléfono y dirección (todos requeridos). La dirección tiene **autocompletado vía Nominatim**, acotado al bounding box de CABA (`countrycodes=ar`, `viewbox`, `bounded=1`). Cambiar el email dispara la confirmación de Supabase Auth.

---

## Frontend — Panel de administración

`AdminLayout` (en `/dashboard` para `role = "admin"`): sidebar con navegación por estado local (no hay sub-rutas), versión mobile con overlay, link "Ver tienda" y cerrar sesión.

| Sección | Componente | Qué hace |
|---|---|---|
| **Resumen** | `AdminReports` | KPIs: ingresos totales (pedidos `confirmed`/`preparing`/`shipping`/`delivered`), total de pedidos (sin cancelados), productos activos, clientes. Conteo por estado y tabla de pedidos recientes. |
| **Productos** | `AdminProducts` | CRUD vía API (incluye variantes con grosor Fino/Medio/Grueso, unidad, stock, badge, destacado, activo). Subida de imagen al bucket `productos`. **Exportar a Excel** (`productos_la_vaca_roja.xlsx`) e **importar desde Excel** (crea o actualiza por columna `ID`). **Edición masiva** de los seleccionados: precio (±% o ±monto), stock (fijar / sumar / restar), categoría y estado. |
| **Categorías** | `AdminCategories` | CRUD de la tabla `categories` (nombre, activa) con conteo de productos. Al renombrar, actualiza `products.category` en cascada. Si la tabla no carga, muestra el SQL sugerido para crearla y sus políticas RLS. |
| **Promociones** | `AdminPromotions` | Dos pestañas: **Descuentos** (setea `sale_price` + vigencia `promo_starts_at`/`promo_ends_at` sobre productos existentes, por % o monto fijo, individual o masivo, con estado próximo/activo/vencido) y **Combos** (CRUD de productos `is_combo = true`, unidad `pack`, con imagen). |
| **Usuarios** | `AdminUsers` | Listado con búsqueda, conteo clientes/admins, edición de nombre/teléfono, **cambio de rol** (API), **envío de email de reset de contraseña** y **exportación a PDF** (jsPDF + autotable). |
| **Cupones** | `AdminCoupons` | CRUD de `coupons`: código (con generador aleatorio de 8 caracteres y botón copiar), tipo `percentage`/fijo, valor, compra mínima, usos máximos, vencimiento, activo; muestra usos actuales. |
| **Pedidos** | `AdminOrders` | Listado vía API con datos del cliente, filtros por estado, cliente y rango de fechas, paginación, modal de detalle, **cambio de estado** y **descarga del pedido en .txt** (para impresión/preparación). |
| **Configuración** | `AdminSettings` | Edita los settings del negocio (ver [Reglas de negocio](#settings-tabla-settings)) vía `PATCH /api/settings`. |

---

## Backend — API REST

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 · Supabase JS + `@supabase/ssr` · Mercado Pago SDK 2 · Tailwind CSS 4 (template).

### CORS

Lo resuelven `src/middleware.ts` y los helpers `corsResponse` / `corsError` / `handleOptions` de `src/utils/supabase/api.ts`. Se refleja el `Origin` si es:

- `http://localhost*`, o
- cualquier subdominio HTTPS de `lavacaroja.com.ar` (regex `^https://([a-z0-9-]+\.)*lavacaroja\.com\.ar$`: prod, admin, previews `test-*`).

> `FRONTEND_URL` **no** interviene en CORS: sólo se usa para armar las `back_urls` de Mercado Pago.

### Autenticación

El frontend manda `Authorization: Bearer <supabase access_token>`. Helpers:

- `getAuthUser(req)` → usuario o `null` (401).
- `getAuthProfile(req)` → usuario + fila de `profiles`.
- `requireAdmin(req)` → 401 sin sesión, 403 si `role !== "admin"`.

### Endpoints

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/products` | GET | Público | Productos activos con `product_variants`. Query: `?category=<nombre>`, `?all=true` (incluye inactivos). |
| `/api/products` | POST | Admin | Crea producto; si el body trae `variants`, las inserta. |
| `/api/products/[id]` | GET | Público | Producto con variantes (404 si no existe). |
| `/api/products/[id]` | PUT | Admin | Actualiza producto; si viene `variants`, **reemplaza** todas las variantes. |
| `/api/products/[id]` | DELETE | Admin | Elimina el producto. |
| `/api/orders` | GET | Usuario | Admin: todos los pedidos + `profiles` (join manual, no hay FK). Cliente: sólo los propios. |
| `/api/orders` | POST | Usuario | Crea pedido simple (ítems, cupón, notas). **Legacy:** el front usa `create-preference`. |
| `/api/orders/[id]` | GET | Dueño o admin | Detalle con ítems. |
| `/api/orders/[id]` | PATCH | Dueño o admin | Admin: cualquier estado válido. Cliente: sólo `cancelled` y sólo si está `pending`. |
| `/api/coupons/validate` | POST | Usuario | Body `{ code, subtotal }`. Valida sin incrementar usos y devuelve `discount` y `total_after`. **No lo usa el frontend actual.** |
| `/api/promotions` | GET | Público | Filas activas de la tabla `promotions`. **No lo usa el frontend actual** (los combos son productos `is_combo`). |
| `/api/promotions` | POST | Admin | Inserta en `promotions`. |
| `/api/promotions` | DELETE | Admin | Body `{ id }`. |
| `/api/settings` | GET | Público | Todos los settings como objeto `{ key: value }`. |
| `/api/settings` | PATCH | Admin | Body `{ key, value }`, hace upsert. |
| `/api/shipping/estimate` | GET | Usuario | Geocodifica `profiles.address` y devuelve `{ zone, distance_km }` o un error legible. |
| `/api/users` | GET | Admin | Todos los `profiles`. |
| `/api/users` | PATCH | Admin | Body `{ id, role }` con `role ∈ {admin, cliente}`. |
| `/api/payment/create-preference` | POST | Usuario | **Checkout principal**: calcula zona, envío y descuentos, crea `orders` + `order_items`, incrementa el uso del cupón y, si es MP, crea la preferencia. Ver abajo. |
| `/api/payment/retry` | POST | Dueño | Body `{ order_id }`. Nueva preferencia MP para un pedido `pending` propio. |
| `/api/payment/webhook` | POST | Mercado Pago | Notificación `type=payment`: consulta el pago y actualiza `orders.status` por `external_reference`. Responde siempre 200. |

Todas las rutas exponen `OPTIONS` para el preflight.

#### `POST /api/payment/create-preference`

```jsonc
// Request
{
  "items": [{ "product_id": 1, "product_name": "Ojo de bife", "variant_name": "Por bife - Medio",
              "quantity": 1.5, "unit_price": 18000, "line_total": 27000 }],
  "coupon_id": 3,                    // opcional
  "notes": "Tocar timbre 2B",        // opcional
  "delivery_method": "delivery",     // "delivery" | "pickup"
  "payment_method": "mercadopago"    // "mercadopago" | "transferencia"
}

// Response 201 — Mercado Pago
{ "init_point": "...", "sandbox_init_point": "...", "order_id": 42, "payment_method": "mercadopago" }

// Response 201 — Transferencia
{ "order_id": 42, "payment_method": "transferencia", "total": 81000 }
```

Preferencia MP: ítems en ARS (+ ítem "Envío" si corresponde), `external_reference = order.id`, `back_urls` → `${FRONTEND_URL}/pago/{exitoso|fallido|pendiente}`, `auto_return: approved`, `notification_url` → `${BACKEND_PUBLIC_URL}/api/payment/webhook`.

#### Webhook → estado del pedido

| Estado MP | `orders.status` |
|---|---|
| `approved` | `confirmed` |
| `rejected`, `cancelled` | `cancelled` |
| cualquier otro | `pending` |

---

## Reglas de negocio

### Cálculo del total (`create-preference`, replicado en `Cart.jsx`)

```
subtotal           = Σ line_total
descuento_cupón    = percentage ? subtotal × valor/100 : min(valor, subtotal)
subtotal_con_cupón = subtotal − descuento_cupón
descuento_transf   = pago por transferencia ? subtotal_con_cupón × transfer_discount_percent/100 : 0
monto              = subtotal_con_cupón − descuento_transf
envío              = retiro ? 0 : (monto ≥ free_shipping_min ? 0 : costo_de_la_zona)
total              = monto + envío
```

### Zonas de envío (`backend/src/utils/shipping.ts`)

- Origen: local en **Gascón 801, CABA** (`-34.6014881, -58.4238165`).
- Geocoding con Nominatim (`countrycodes=ar`, `User-Agent: LaVacaRoja-Ecommerce/1.0`).
- Sólo se acepta si el resultado está en CABA (`ISO3166-2-lvl4 === "AR-C"`).
- Distancia en línea recta (Haversine):

| Distancia | Zona | Costo default |
|---|---|---|
| ≤ 3 km | `zone_1_3` | $3.500 |
| 3–5 km | `zone_3_5` | $4.500 |
| 5–10 km | `zone_5_10` | $6.000 |
| > 10 km | — | Rechazado ("todavía no llegamos a esa zona") |
| Retiro en local | `pickup` | $0 |

### Settings (tabla `settings`)

| Key | Default | Uso |
|---|---|---|
| `free_shipping_min` | `90000` | Monto mínimo (post descuentos) para envío gratis |
| `shipping_zone_1_3` | `3500` | Costo envío zona 1–3 km |
| `shipping_zone_3_5` | `4500` | Costo envío zona 3–5 km |
| `shipping_zone_5_10` | `6000` | Costo envío zona 5–10 km |
| `transfer_discount_percent` | `10` | % de descuento por transferencia |
| `transfer_alias` | `lavacaroja801` | Alias mostrado en carrito y confirmación |
| `transfer_holder_name` | titular de la cuenta | Titular mostrado junto al alias |

Los defaults están duplicados en backend y frontend por si el setting no existe. El texto de `ShippingTopBar` ("Envío gratis desde $90.000 · 10% OFF con transferencia") está **hardcodeado** y no lee los settings.

### Estados de pedido

`pending` (Pendiente) → `confirmed` (Pago confirmado) → `preparing` (Preparando) → `shipping` (Enviando) → `delivered` (Entregado) · `cancelled` (Cancelado).

- Pedidos MP: pasan a `confirmed` automáticamente vía webhook.
- Pedidos por transferencia: quedan `pending` hasta que el admin verifica el comprobante (enviado por WhatsApp) y cambia el estado a mano.
- El resto de las transiciones las hace el admin desde **Pedidos**.

### Cupones

- Código en mayúsculas, tipo `percentage` o monto fijo (tope = subtotal).
- Restricciones opcionales: `min_order_amount`, `max_uses` (vs `uses_count`), `expires_at`, `active`.
- `uses_count` se incrementa al **crear** el pedido (no al pagarlo).

---

## Base de datos (Supabase)

No hay migraciones versionadas en el repo; el esquema se infiere del código.

| Tabla | Columnas relevantes |
|---|---|
| `profiles` | `id` (= `auth.users.id`), `full_name`, `email`, `phone`, `address`, `role` (`admin` \| `cliente`), `created_at` |
| `products` | `id`, `name`, `category` (nombre, no FK), `description`, `price`, `stock`, `image_url`, `unit`, `badge` (`promo` \| `new` \| `premium`), `active`, `featured`, `has_variants`, `is_combo`, `sale_price`, `promo_starts_at`, `promo_ends_at`, `created_at`, `updated_at` |
| `product_variants` | `id`, `product_id`, `name`, `active` |
| `categories` | `id`, `name`, `active` |
| `coupons` | `id`, `code`, `discount_type`, `discount_value`, `min_order_amount`, `max_uses`, `uses_count`, `expires_at`, `active` |
| `orders` | `id`, `user_id`, `status`, `subtotal`, `coupon_id`, `coupon_discount`, `transfer_discount`, `shipping_cost`, `shipping_zone`, `delivery_method`, `payment_method`, `total`, `notes`, `created_at`, `updated_at` |
| `order_items` | `order_id`, `product_id`, `product_name`, `variant_name`, `quantity`, `unit_price`, `line_total` |
| `settings` | `key` (PK), `value` (texto), `updated_at` |
| `promotions` | Tabla legacy, sólo usada por `/api/promotions` |

**Storage (buckets públicos):** `productos` (imágenes de productos y combos), `logo` (logo del admin), `logosBancos` (logos de bancos del Home).

**RLS:** como el frontend escribe directo en `products`, `categories`, `coupons` y `profiles`, las políticas RLS son las que realmente protegen esas tablas (sólo admin debería poder escribir catálogo/cupones; cada usuario sólo su perfil y sus pedidos).

---

## Variables de entorno

### Frontend (`frontend/.env.local`)

```env
VITE_SUPABASE_URL=                 # URL del proyecto Supabase
VITE_SUPABASE_PUBLISHABLE_KEY=     # Publishable / anon key (pública)
VITE_API_URL=                      # URL del backend (default: http://localhost:3000)
VITE_MP_SANDBOX=                   # "true" → usa sandbox_init_point de MP (en `npm run dev` siempre se usa sandbox)
```

### Backend (`backend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Solo servidor (webhook MP). Nunca exponer ni commitear.
MP_ACCESS_TOKEN=                   # Access token de Mercado Pago (TEST-… o APP_USR-…)
FRONTEND_URL=                      # Base de las back_urls de MP (default: http://localhost:5173)
BACKEND_PUBLIC_URL=                # URL pública del backend para notification_url (default: http://localhost:3000)
```

> En local, el webhook de MP no llega a `localhost`: para probarlo hace falta exponer el backend (p. ej. con un túnel) y setear `BACKEND_PUBLIC_URL` a esa URL.

### MCP (opcional, desarrollo con IA)

`.mcp.json.example` define dos servidores MCP de Mercado Pago (`mercadopago-test` y `mercadopago-prod`, SSE en `https://mcp.mercadopago.com/mcp`). Copiarlo a `.mcp.json` con los tokens reales; `.mcp.json` está en `.gitignore`.

---

## Desarrollo local

Requisitos: Node.js 20+ y acceso al proyecto de Supabase y a credenciales de Mercado Pago (test).

```bash
# Backend (API) — http://localhost:3000
cd backend
npm install
npm run dev

# Frontend (tienda + paneles) — http://localhost:5173
cd frontend
npm install
npm run dev
```

| Proyecto | Scripts |
|---|---|
| `frontend` | `dev` (Vite) · `build` · `preview` · `lint` (ESLint 9) |
| `backend` | `dev` (Next) · `build` · `start` · `lint` |

Para entrar al panel admin hay que tener una cuenta con `profiles.role = 'admin'` (se puede setear desde otro admin o directo en Supabase).

READMEs específicos: [`frontend/README.md`](frontend/README.md) · [`backend/README.md`](backend/README.md).

---

## Deploy

Dos proyectos separados en **Vercel**, cada uno con root directory en su carpeta:

| Proyecto | Root | Config | Notas |
|---|---|---|---|
| Frontend | `frontend/` | `vercel.json` con rewrite `/(.*) → /index.html` (SPA) | Vercel Web Analytics habilitado |
| Backend | `backend/` | `vercel.json` con `framework: nextjs` | Debe ser accesible públicamente para el webhook de MP |

Checklist de producción:

- Variables de entorno cargadas en cada proyecto de Vercel (mismas claves que los `.env.local`).
- `VITE_API_URL` → URL pública del backend.
- `FRONTEND_URL` → URL pública de la tienda (back_urls de MP).
- `BACKEND_PUBLIC_URL` → URL pública del backend (webhook de MP).
- `MP_ACCESS_TOKEN` de producción (`APP_USR-…`) y `VITE_MP_SANDBOX` vacío o `false`.
- Si el dominio del front no es `*.lavacaroja.com.ar`, hay que ampliar la regex de CORS en `middleware.ts` y `utils/supabase/api.ts`.

---

## Stack completo

| Tecnología | Versión | Dónde | Uso |
|---|---|---|---|
| [React](https://react.dev/) | 19.x | ambos | UI |
| [Vite](https://vitejs.dev/) | 8.x | frontend | Bundler y dev server |
| [React Router DOM](https://reactrouter.com/) | 7.x | frontend | Enrutamiento SPA |
| [lucide-react](https://lucide.dev/) | 1.x | frontend | Iconografía |
| [Next.js](https://nextjs.org/) | 16.x | backend | API routes (App Router) |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | backend | Tipado |
| [Supabase JS](https://supabase.com/) / `@supabase/ssr` | 2.x / 0.10.x | ambos / backend | Postgres, Auth y Storage |
| [Mercado Pago SDK](https://www.mercadopago.com.ar/developers/) | 2.x | backend | Checkout Pro, consulta de pagos |
| [Nominatim / OpenStreetMap](https://nominatim.org/) | — | ambos | Autocompletado de dirección y geocoding de zonas |
| [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | 4.x / 5.x | frontend | Export PDF de usuarios |
| [xlsx (SheetJS)](https://github.com/SheetJS/sheetjs) | 0.18.x | frontend | Import/export Excel de productos |
| [@vercel/analytics](https://vercel.com/docs/analytics) | 2.x | frontend | Analítica web |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | backend | Estilos del template TailAdmin |
| ApexCharts · FullCalendar · react-dnd · jvectormap · Swiper · flatpickr · react-dropzone | — | backend | Componentes del template (sin uso real) |
| `react-helmet-async` | 3.x | frontend | Instalado pero sin uso |

---

## Deuda técnica y problemas conocidos

Relevado al analizar el código (octubre 2026). Ordenado por prioridad.

### Seguridad

1. **`frontend/test.js` está commiteado con la `service_role` key de Supabase hardcodeada.** Esa key saltea RLS y da acceso total a la base. Hay que **rotarla en Supabase**, borrar el archivo y, si el repo es o fue público, considerar limpiar el historial.
2. **Los precios los manda el cliente.** `create-preference` (y `POST /api/orders`) confía en `unit_price` / `line_total` del body; un usuario podría pagar el monto que quiera. El backend debería recalcular precios (incluida la promo vigente) desde `products` / `product_variants`.
3. **El webhook de MP no valida la firma** (`x-signature`) y, si falta `SUPABASE_SERVICE_ROLE_KEY`, cae silenciosamente a la publishable key (y las actualizaciones fallarían por RLS sin aviso).
4. **Cupones validados sólo en el cliente**: el drawer valida contra Supabase y al crear la orden el backend sólo chequea `active` (no vencimiento, usos ni mínimo). Debería usarse `/api/coupons/validate` y repetir esas validaciones al crear la orden.
5. Varias escrituras de admin (catálogo, cupones, categorías, descuentos, combos, perfil de otros usuarios) van directo a Supabase: su seguridad depende 100% de RLS.

### Bugs / inconsistencias

- **Cancelación**: el panel de cliente ofrece cancelar en `pending`, `confirmed` y `preparing`, pero el backend sólo permite `pending` → el usuario ve un error en los otros dos.
- **Reintento de pago**: `retry` calcula el envío como `total − subtotal + coupon_discount`, ignorando `transfer_discount`; si se reintenta por MP un pedido creado por transferencia, el monto del ítem "Envío" sale mal.
- `uses_count` del cupón se incrementa al crear el pedido aunque después no se pague o se cancele.
- El stock (`products.stock`) no se descuenta al vender.

### Limpieza

- `ShippingTopBar` tiene "$90.000" y "10% OFF" hardcodeados en vez de leer `free_shipping_min` / `transfer_discount_percent`.
- Endpoints sin uso desde el front: `POST /api/orders`, `/api/coupons/validate`, `/api/promotions` (y la tabla `promotions`).
- `createAdminClient()` sin uso; CORS duplicado entre `middleware.ts` y `utils/supabase/api.ts`.
- Páginas y dependencias del template TailAdmin en `backend/` sin uso real (se podrían eliminar para reducir el bundle).
- `react-helmet-async` instalado pero no usado (no hay meta tags por página).
- Links del footer (Términos, Privacidad, Medios de pago, Envíos, Contacto) apuntan a `#`.
- Descuentos bancarios, estadísticas del hero, horarios y número de WhatsApp están hardcodeados en el código.
- No hay migraciones SQL ni seed versionados para Supabase; tampoco tests.
- `backend/tsconfig.tsbuildinfo` y `.DS_Store` sueltos en el repo.

---

## Información del negocio

| | |
|---|---|
| **Nombre** | La Vaca Roja |
| **Rubro** | Carnicería premium |
| **Dirección** | Gascón 801, CABA, Buenos Aires, Argentina |
| **Trayectoria** | Desde 2004 |
| **Horarios** | Lun–Sáb 8:00–21:00 · Dom y feriados 10:00–20:00 |
| **WhatsApp** | +54 9 11 6687-4595 |
| **Delivery** | Sólo CABA, hasta 10 km del local; mismo día para pedidos antes de las 14 hs |
| **Envío gratis** | Desde $90.000 (configurable) |
| **Pagos** | Mercado Pago (Checkout Pro) o transferencia (10% OFF, configurable) |
| **Redes** | [Instagram](https://instagram.com/lavacaroja) · [Facebook](https://facebook.com/lavacaroja) |

---

## Licencia

© 2026 La Vaca Roja · Todos los derechos reservados. `backend/` incluye código del template TailAdmin Next.js (MIT) — ver [`backend/LICENSE`](backend/LICENSE).
