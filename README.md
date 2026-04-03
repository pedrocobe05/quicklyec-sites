# Quickly Sites

Quickly Sites es una plataforma SaaS multi-tenant para la creación de sitios públicos con reservas online, orientada a negocios que requieren gestión de servicios, staff y citas.

## Estructura del Monorepo

El proyecto está organizado como monorepo e incluye:

- **apps/api**: Backend (NestJS, TypeORM, PostgreSQL)
- **apps/admin**: Panel de administración (React, Vite, Tailwind)
- **apps/public**: Sitio público (React, Vite, Tailwind)
- **packages/shared**: Tipos y contratos compartidos

## ¿Qué ofrece?

- Resolución multi-tenant por dominio
- Motor de landing page por secciones
- Reservas online (servicios, disponibilidad, creación de citas)
- Autenticación y panel de administración para gestión de servicios, staff, reservas y branding
- SEO multi-tenant básico
- almacenamiento de assets por tenant con entrega pública optimizada

## Instalación y ejecución

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Ejecuta las migraciones y el seed (opcional, según tu entorno):
   ```bash
   npm run typeorm -w @quickly-sites/api -- migration:run
   npm run seed -w @quickly-sites/api
   ```
3. Inicia los servicios de desarrollo:
   - Backend:
     ```bash
     npm run dev:api
     ```
   - Admin:
     ```bash
     npm run dev:admin
     ```
   - Sitio público:
     ```bash
     npm run dev:public
     ```

## URLs por defecto

- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs
- Admin: http://localhost:5173
- Público: http://localhost:5174

## Despliegue en Cloudflare Pages (monorepo)

Para este monorepo conviene crear **dos proyectos en Cloudflare Pages**:

1. `quickly-admin` para `apps/admin`
2. `quickly-public` para `apps/public`

Configuración recomendada para ambos proyectos:

- **Framework preset**: `None` (o `Vite`, ambos funcionan)
- **Root directory**: `/` (raíz del repo)
- **Build command (admin)**: `npm run build -w @quickly-sites/admin`
- **Build command (public)**: `npm run build -w @quickly-sites/public`
- **Build output directory (admin)**: `apps/admin/dist`
- **Build output directory (public)**: `apps/public/dist`

> Importante: usar la raíz del repo permite que Cloudflare instale y resuelva los workspaces (`apps/*` y `packages/*`), incluyendo `@quickly-sites/shared`.

### Variables de entorno en Pages

Configura por proyecto (admin/public) variables como:

- `VITE_API_BASE_URL` apuntando a tu backend (`https://api.tudominio.com/api`, por ejemplo).

Si usas dominios multi-tenant en el frontend público, agrega las variables de dominio necesarias según tu implementación de `apps/public/src/lib/api.ts`.

## Backend: EC2 vs Cloudflare Workers

Actualmente el backend (`apps/api`) es NestJS + TypeORM, diseñado para Node.js con PostgreSQL, por lo que el camino más directo es:

- **Producción recomendada ahora**: desplegar `apps/api` en EC2 (o ECS/Fargate/Fly/Render) detrás de Nginx + HTTPS.
- **Workers** puede ser mejor a futuro si migras a una arquitectura edge-first (por ejemplo Hono + D1/Hyperdrive + colas), pero **no es migración directa** desde este NestJS sin cambios importantes.

Resumen práctico:

- Si quieres salir rápido a producción: **Pages (admin/public) + API en EC2**.
- Si priorizas latencia global y edge runtime: evaluar un rediseño para Workers.
--
Para más detalles sobre la arquitectura o contribuciones, revisa la documentación interna o contacta al equipo de desarrollo.
npm run typeorm -w @quickly-sites/api -- migration:run

## Almacenamiento de assets

El proyecto está preparado para usar Cloudflare R2 como almacenamiento principal de branding, imágenes del sitio y assets por tenant.

Referencia de configuración:

- [CLOUDFLARE_R2_SETUP.md](/Users/andrescobena/Documents/Proyectos/quickly-sites/CLOUDFLARE_R2_SETUP.md)
