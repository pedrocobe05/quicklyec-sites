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
--
Para más detalles sobre la arquitectura o contribuciones, revisa la documentación interna o contacta al equipo de desarrollo.
npm run typeorm -w @quickly-sites/api -- migration:run

## Almacenamiento de assets

El proyecto está preparado para usar Cloudflare R2 como almacenamiento principal de branding, imágenes del sitio y assets por tenant.

Referencia de configuración:

- [CLOUDFLARE_R2_SETUP.md](/Users/andrescobena/Documents/Proyectos/quickly-sites/CLOUDFLARE_R2_SETUP.md)
