# LANË

> "Lo que llevas debajo también importa"

Tienda de lencería fina construida con **Angular 20**, **Supabase** (auth + base de datos) y un
**backend Node/Express** que se despliega en **Render**, mientras el frontend se publica en **Vercel**.

---

## 📁 Estructura

```
lane/
├── public/
│   ├── products/                   <- ⭐ fotos de los 10 productos (se sirven en Vercel)
│   ├── lane.png, lane-192.png...   <- logo
│   └── favicon.ico
├── src/
│   ├── index.html                  <- Tailwind CDN + fuentes + iconos (config idéntica al diseño)
│   ├── styles.css                  <- clases globales (backdrop-blur, text-gradient, scrollbar)
│   ├── environments/
│   │   ├── environment.ts               <- PRODUCCIÓN (Supabase + URL de Render)
│   │   └── environment.development.ts   <- LOCAL (Supabase + http://localhost:4000/api)
│   ├── app/
│   │   ├── core/
│   │   │   ├── data/products.data.ts        <- catálogo semilla (respaldo)
│   │   │   ├── validators/password.ts       <- reglas de contraseña
│   │   │   ├── guards/guest-only.guard.ts   <- landing/login solo sin sesión
│   │   │   ├── models/product.model.ts
│   │   │   └── services/
│   │   │       ├── storage.service.ts       <- AsyncStorage + espejo localStorage
│   │   │       ├── auth.service.ts          <- sesión (local o Supabase)
│   │   │       ├── supabase.service.ts      <- auth + consultas a la DB
│   │   │       ├── cart.service.ts          <- carrito, quick view, modal de sesión, toast
│   │   │       ├── products.service.ts      <- catálogo, filtros, colores y talles
│   │   │       └── api.service.ts           <- llamadas al backend en Render
│   │   ├── shared/                        <- header, footer, carrito, modales, secciones
│   │   │   └── sections/about/            <- "Conoce a LANË"
│   │   ├── pages/
│   │   │   ├── landing/                    <- 1) landing page
│   │   │   ├── login/                      <- 2) login o registro
│   │   │   └── home/                       <- 3) home
│   │   ├── app.routes.ts
│   │   └── app.config.ts
│   └── ...
├── backend/                       <- API REST (Render)
│   ├── src/server.js, config.js, supabase.js
│   ├── src/routes/{products,cart,orders}.js
│   ├── src/middleware/auth.js
│   ├── .env.example
│   └── render.yaml
├── supabase/schema.sql            <- ⭐ CREA TODA LA BASE DE DATOS
└── vercel.json                    <- config del frontend en Vercel
```

---

## 💾 Sesión local con AsyncStorage

La app **funciona completa desde el minuto uno, aunque Supabase todavía no exista**.
Cada llave se guarda en dos lugares:

| Llave | Contenido |
|-------|-----------|
| `lane:session` | Sesión activa (usuario + token de Supabase si aplica) |
| `lane:accounts` | Cuentas creadas en modo local |
| `lane:cart:<userId>` | Carrito del usuario |

- **AsyncStorage** (IndexedDB vía localForage) es el almacenamiento principal, asíncrono y durable.
- **localStorage** guarda un espejo **síncrono** de cada llave.

> ¿Por qué el espejo? Porque la app **jamás debe esperar a IndexedDB para pintar**.
> El guard y el primer render leen el espejo sincrónico, así que la landing nunca queda
> en blanco aunque el navegador tarde en abrir la base. Si el dato solo viviera en
> IndexedDB, `hydrateFromAsyncStorage()` lo recoge en segundo plano.

Cuando llenas `supabaseUrl` / `supabaseKey`, Supabase toma el relevo automáticamente:
`isLocalMode()` pasa a `false` y las sesiones se validan contra la DB real.

---

## 🧭 Navegación implementada

| Ruta | Acceso | Qué hace |
|------|--------|----------|
| `/` (landing) | **Solo sin sesión** | Página de bienvenida. Si ya hay sesión iniciada, redirige sola a `/home`. |
| `/login` | **Solo sin sesión** | Login y registro en la misma pantalla (pestañas). Botón "Explorar como invitado". |
| `/home` | **Todos** | **Sin sesión** ve solo la línea Alpaca y puede filtrar/abrir el detalle; al agregar al carrito se abre el modal de autenticación. **Con sesión** ve también la colección premium Maison du Soie, y puede agregar al carrito, cambiar cantidades, hacer checkout y cerrar sesión. |

### Registro con verificación de correo

- **Contraseña**: mínimo 8 caracteres, al menos una minúscula, una mayúscula y un símbolo. Se muestra
  un checklist en vivo mientras escribes.
- **Con Supabase configurado**: `signUp` envía un correo real de confirmación. La cuenta no obtiene
  sesión hasta que se abre el enlace (el redirect vuelve a `/login`). Hay botón para reenviar el correo.
- **Modo local/demo (sin Supabase)**: no hay servidor de correo, así que se genera un código de
  6 dígitos y se muestra en pantalla para poder probar el flujo completo. También vence en 15 minutos.

> En Supabase, configura **Authentication → URL Configuration → Site URL** con tu dominio de Vercel y
> agrega `https://tu-dominio.vercel.app/login` a **Redirect URLs**. Sin eso, el enlace de confirmación
> no vuelve correctamente a la app.

---

## 🛍️ Catálogo y fotos (Vercel)

Los productos viven en **tres lugares** que deben mantenerse sincronizados:

| Lugar | Para qué |
|-------|----------|
| `src/app/core/data/products.data.ts` | Catálogo de respaldo que usa el frontend si Supabase no responde |
| `supabase/schema.sql` | Seed real de la base de datos |
| `backend/src/supabase.js` | Respaldo del backend en Render |

Las fotos van en **`public/products/`**. Angular copia `public/` tal cual a
`dist/lane/browser/`, así que Vercel las sirve como archivos estáticos en
`https://tu-dominio.vercel.app/products/<archivo>.jpg`. No necesitas un bucket externo: el plan
gratuito de Vercel sirve estos ~920 KB sin problema.

Para cambiar una foto: reemplaza el archivo manteniendo el nombre, o sube uno nuevo y actualiza el
campo `image` del producto (ej. `products/mi-foto.jpg`).

### Documentos fuente (`lane barato.docx` / `lane premium.docx`)

Los dos `.docx` de la clienta son **material fuente**, no archivos que la web necesite descargar.
Se quedan en la raíz del repo para editar el catálogo; lo que sí se despliega en Vercel son las
10 fotos extraídas y optimizadas que están en `public/products/`. Si algún día quieres publicar los
documentos originales, muévelos a `public/catalogo/` y quedarán accesibles en
`https://tu-dominio.vercel.app/catalogo/lane-barato.docx` (no es recomendable: pesan varios MB y
no aportan nada al comprador).

### Foto de la fundadora

La sección **Conoce a LANË** ya tiene el espacio y la firma de Sharon. Mientras no exista una foto
profesional autorizada, usa una imagen de marca (`products/maison-marfil.jpg`) para no inventar
una identidad. Cuando Sharon apruebe una foto, guárdala como `public/founders/sharon.jpg` y cambia
el `src` del bloque `<!-- Para usar una foto real de Sharon... -->` en
`src/app/shared/sections/about/about.html`. Una foto real de la fundadora **sí ayuda** a la
confianza de una marca de lencería, pero debe ser una foto real, con consentimiento y de buena
calidad; una imagen generada por IA sería contraproducente.

### Línea básica vs. premium

- `tier: 'basico'` → línea Alpaca (`$14.90`). Visible para todas las visitas.
- `tier: 'premium'` → Maison du Soie (`$49.90`). Solo aparece con sesión iniciada.

El filtro se aplica en **tres capas**: `ProductsService` (frontend), las políticas **RLS** de
Supabase (`tier = 'basico'` para `anon`) y el backend (mismo criterio en `/api/products`).

---

## ⚙️ 1. Conectar Supabase

### a) Crear la base de datos (automática)

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) → tu proyecto.
2. Abre el **SQL Editor**.
3. Copia **todo** el contenido de [`supabase/schema.sql`](./supabase/schema.sql) y presiona **Run**.

Con eso se crean: `profiles`, `products`, `cart_items`, `orders`, `order_items`,
`newsletter_subscribers`, el trigger de perfil automático, las políticas **RLS** y el catálogo inicial.

### b) Llenar los campos del frontend

`src/environments/environment.ts`:

```ts
export const environment = {
  production: true,
  supabaseUrl: 'https://TU_PROYECTO.supabase.co',          // Project Settings -> API
  supabaseKey: 'TU_SUPABASE_ANON_KEY',                     // la "anon" / "publishable" key
  apiUrl: 'https://TU_BACKEND.onrender.com/api'            // <- el link que te da Render
};
```

Mientras no cambies los placeholders, la app funciona igual: usa el catálogo local y muestra un aviso
al suscribirse al newsletter.

> En **Supabase → Authentication → Providers → Email** deja habilitado el proveedor y activa
> **Confirm email**. Con esa opción activa, el registro no devuelve sesión hasta que la persona
> abre el enlace del correo, que es justo la verificación que pide el registro. Si la desactivas,
> Supabase inicia sesión de inmediato y se salta la verificación.

---

## 🚀 2. Backend en Render

### Deploy manual (dashboard)

1. Sube el repo a GitHub y ve a [dashboard.render.com](https://dashboard.render.com).
2. **New → Web Service** → conecta el repo.
3. Configura:

| Campo | Valor |
|-------|-------|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

4. En **Environment** agrega:

```
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SUPABASE_SERVICE_ROLE_KEY   ← la "service_role" (privada)
CORS_ORIGINS=https://tu-frontend.vercel.app
NODE_ENV=production
```

5. **Deploy**. Render te dará un link tipo `https://lane-backend.onrender.com`.
6. Pega ese link (con `/api` al final) en `apiUrl` de `src/environments/environment.ts`.

> También puedes usar **Blueprints**:Render lee solo `backend/render.yaml` si lo subes al repo.

### Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/products` | Catálogo (desde DB o semilla) |
| GET | `/api/products/:id` | Detalle de producto |
| GET | `/api/session` | Valida el token de Supabase |
| POST | `/api/cart/summary` | Calcula subtotal / total |
| PUT | `/api/cart` | Sincroniza el carrito (requiere token) |
| POST | `/api/newsletter` | Alta al newsletter |
| POST | `/api/checkout` | Crea pedido + order_items (requiere token) |

### Probarlo en local

```bash
cd backend
npm install
npm run dev
# http://localhost:4000/api/health
```

---

## 🌐 3. Frontend en Vercel

1. Sube el repo (incluye la carpeta `backend/`) a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. Vercel detecta Angular gracias a `vercel.json`
   (`buildCommand: npm run build`, `outputDirectory: dist/lane/browser`).
4. Antes de desplegar, confirma que `src/environments/environment.ts` tenga tus valores reales
   de Supabase y de Render.
5. **Deploy**.

> En Vercel puedes dejar el build con los placeholders y pegarle los valores reales después;
   lo importante es que `apiUrl` apunte al backend de Render **antes** de que se pruebe el checkout.

---

## 💻 Desarrollo local

```bash
npm install          # frontend
npm start            # http://localhost:4200

cd backend
npm install          # backend
npm run dev          # http://localhost:4000/api
```

---

## 🎨 Nota de diseño

La base visual es la del HTML original (`landing_page_cacheteros.html`): misma paleta de marca,
tipografías (Cormorant Garamond + Plus Jakarta Sans), mismas clases Tailwind, carrito lateral,
quick view, filtros y reseñas. Los productos ahora usan **fotos reales** (`public/products/`) en
lugar de las ilustraciones SVG, y se añadió la sección **Conoce a LANË**.

Los iconos de Lucide se renderizan como **componente Angular** (`app-icon`) en lugar del script CDN,
para que el DOM no se rompa al re-renderizar las listas.

> Tailwind se carga por CDN (`cdn.tailwindcss.com`) para conservar el diseño tal cual.
> Para producción de verdad, lo correcto es instalar Tailwind como dependencia y compilarlo
> en build; mientras tanto la consola del navegador mostrará un aviso de "producción".