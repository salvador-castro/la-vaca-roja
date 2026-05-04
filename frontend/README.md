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
- **Descuentos bancarios** — Cuenta DNI, BBVA, Ualá
- **Carrito lateral** con persistencia de sesión (CartContext)
- **Checkout** integrado con Mercado Pago
- **Autenticación** — registro, login y reset de contraseña (Supabase Auth)
- **Dashboard privado** para clientes (ruta protegida por PrivateRoute)
- **Exportación** de datos en PDF y Excel
- **Scroll reveal animations** con IntersectionObserver
- **Responsive design** (mobile-first)

## Páginas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `Home` | Landing con hero, promos y productos destacados |
| `/shop` | `Shop` | Catálogo completo |
| `/cart` | `Cart` | Carrito de compras |
| `/login` | `Login` | Inicio de sesión |
| `/register` | `Register` | Crear cuenta |
| `/dashboard` | `Dashboard` | Área privada del cliente |
| `/pago/exitoso` | `PaymentSuccess` | Confirmación de pago |
| `/pago/pendiente` | `PaymentPending` | Pago en proceso |
| `/pago/fallido` | `PaymentFailure` | Error en el pago |
| `/reset-password` | `ResetPassword` | Recuperar contraseña |

---

## Estructura del proyecto

```
frontend/
├── public/
├── src/
│   ├── assets/            # Imágenes y recursos estáticos
│   ├── components/
│   │   ├── Navbar.jsx     # Barra de navegación + carrito
│   │   ├── Footer.jsx     # Pie de página
│   │   ├── CartDrawer.jsx # Carrito lateral deslizable
│   │   ├── ProductCard.jsx # Card de producto
│   │   ├── ProductModal.jsx # Modal detalle de producto
│   │   ├── PrivateRoute.jsx # HOC protección de rutas
│   │   └── ScrollToTop.jsx  # Reset de scroll en navegación
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
│   │   ├── Dashboard.jsx
│   │   ├── PaymentSuccess.jsx
│   │   ├── PaymentPending.jsx
│   │   ├── PaymentFailure.jsx
│   │   └── ResetPassword.jsx
│   ├── App.jsx            # Componente raíz + rutas
│   ├── index.css          # Sistema de diseño personalizado
│   └── main.jsx           # Entry point
├── index.html
├── vite.config.js
└── package.json
```

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz de `/frontend`:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
VITE_MP_PUBLIC_KEY=<tu-mercadopago-public-key>
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
