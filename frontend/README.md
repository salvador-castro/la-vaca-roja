# La Vaca Roja — Frontend (Tienda Online)

Tienda online para **La Vaca Roja**, carnicería premium con más de 20 años de trayectoria en Palermo, Buenos Aires. Construida con React + Vite + Supabase + Mercado Pago.

> Este directorio es el **frontend (cliente)**. El panel de administración se encuentra en `/backend`.

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| [React](https://react.dev/) | 19.x | UI y componentes |
| [Vite](https://vitejs.dev/) | 8.x | Bundler y dev server |
| [Supabase JS](https://supabase.com/docs/reference/javascript/) | 2.x | Base de datos, Storage y Auth |
| [React Router DOM](https://reactrouter.com/) | 7.x | Enrutamiento SPA |
| [Lucide React](https://lucide.dev/) | 1.x | Iconografía |
| [jsPDF](https://github.com/parallax/jsPDF) | 4.x | Exportación de reportes PDF |
| [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | 5.x | Tablas en PDF |
| [xlsx](https://github.com/SheetJS/sheetjs) | — | Exportación Excel |

---

## Funcionalidades

- **Hero** con estadísticas del negocio y accesos rápidos a tienda y promociones
- **Catálogo** con filtros por categoría y búsqueda en tiempo real (cargado desde Supabase)
- **Combos / Promociones** con badges dinámicos (OFERTA / NUEVO / PREMIUM)
- **Descuentos bancarios** (Cuenta DNI, BBVA, Ualá) y **descuento por transferencia**
- **Cupones de descuento**, validados contra la API del backend
- **Carrito lateral** con persistencia de sesión (CartContext)
- **Barra de envío** (`ShippingTopBar`) con cálculo de zona por geocoding de la dirección del perfil (delivery restringido a CABA)
- **Autocompletado de dirección** vía Nominatim/OpenStreetMap en el perfil del cliente
- **Checkout** integrado con Mercado Pago, más flujo alternativo de **transferencia bancaria** con confirmación de comprobante
- **Autenticación** — registro, login y reset de contraseña (Supabase Auth)
- **Dashboard privado** en `/dashboard`, que renderiza según el rol del usuario:
  - **Cliente** → `ClientDashboard` (pedidos, perfil, dirección)
  - **Admin** → `AdminLayout`: Resumen, Productos, Categorías, Promociones, Usuarios, Cupones, Pedidos y Configuración — todo consumiendo la API de `backend/`
- **Exportación** de reportes en PDF y Excel desde el panel admin
- **Scroll reveal animations** con IntersectionObserver y WhatsApp flotante
- **Responsive design** (mobile-first)

## Páginas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `Home` | Landing con hero, promos y productos destacados |
| `/shop` | `Shop` | Catálogo completo |
| `/cart` | `Cart` | Carrito de compras |
| `/login` | `Login` | Inicio de sesión |
| `/register` | `Register` | Crear cuenta |
| `/dashboard` | `Dashboard` | Panel privado — Cliente o Admin según rol (ruta protegida) |
| `/pago/exitoso` | `PaymentSuccess` | Confirmación de pago |
| `/pago/pendiente` | `PaymentPending` | Pago en proceso |
| `/pago/fallido` | `PaymentFailure` | Error en el pago |
| `/transferencia/:orderId` | `TransferConfirmation` | Confirmación de pago por transferencia bancaria |
| `/reset-password` | `ResetPassword` | Recuperar contraseña |

---

## Estructura del proyecto

```
frontend/
├── public/
├── src/
│   ├── assets/            # Imágenes y recursos estáticos
│   ├── components/
│   │   ├── Navbar.jsx        # Barra de navegación + carrito
│   │   ├── Footer.jsx        # Pie de página
│   │   ├── CartDrawer.jsx    # Carrito lateral deslizable
│   │   ├── ProductCard.jsx   # Card de producto
│   │   ├── ProductModal.jsx  # Modal detalle de producto
│   │   ├── ShippingTopBar.jsx # Barra de envío/zona de entrega
│   │   ├── PrivateRoute.jsx  # HOC protección de rutas
│   │   ├── WhatsAppFloat.jsx # Botón flotante de WhatsApp
│   │   └── ScrollToTop.jsx   # Reset de scroll en navegación
│   ├── context/
│   │   ├── CartContext.jsx  # Estado global del carrito
│   │   └── AuthContext.jsx  # Estado global de autenticación
│   ├── hooks/
│   │   └── useProducts.js   # Hook para carga de productos desde Supabase
│   ├── lib/
│   │   └── supabase.js      # Cliente de Supabase
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Shop.jsx
│   │   ├── Cart.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx           # Deriva a ClientDashboard o admin/AdminLayout según rol
│   │   ├── PaymentSuccess.jsx
│   │   ├── PaymentPending.jsx
│   │   ├── PaymentFailure.jsx
│   │   ├── TransferConfirmation.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── client/
│   │   │   └── ClientDashboard.jsx
│   │   └── admin/
│   │       ├── AdminLayout.jsx      # Shell del panel admin (navegación por secciones)
│   │       ├── AdminProducts.jsx
│   │       ├── AdminCategories.jsx
│   │       ├── AdminPromotions.jsx
│   │       ├── AdminCoupons.jsx
│   │       ├── AdminOrders.jsx
│   │       ├── AdminUsers.jsx
│   │       ├── AdminReports.jsx
│   │       └── AdminSettings.jsx
│   ├── App.jsx            # Componente raíz + rutas
│   ├── index.css          # Sistema de diseño personalizado
│   └── main.jsx           # Entry point
├── index.html
├── vite.config.js
└── package.json
```

Las páginas de `pages/admin/` consumen la API REST de `../backend` a través de `VITE_API_URL` (no hablan directo con Supabase).

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz de `/frontend`:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<tu-publishable-key>
VITE_API_URL=http://localhost:3000   # URL de la API del backend; default http://localhost:3000
VITE_MP_SANDBOX=true                 # opcional: "true" para probar con credenciales de test de Mercado Pago
```

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev    # http://localhost:5173
```

### Comandos disponibles

```bash
npm run dev      # Dev server con HMR
npm run build    # Build de producción → /dist
npm run preview  # Preview del build
npm run lint     # Linting con ESLint
```

---

## Licencia

© 2026 La Vaca Roja · Todos los derechos reservados.
