# Quickly Sites

Monorepo inicial para `Quickly Sites`, un SaaS multi-tenant separado del ERP Quickly, orientado a sitios públicos con reservas online.

## Apps

- `apps/api`: backend NestJS + TypeORM + PostgreSQL
- `apps/admin`: panel admin React + Vite + Tailwind
- `apps/public`: sitio público React + Vite + Tailwind
- `packages/shared`: contratos y tipos compartidos

## Base de datos

Configuración usada:

- host: `localhost`
- port: `4533`
- database: `quicklysites`
- user: `postgres`
- password: `2412`

## Qué quedó implementado

- resolución multi-tenant por host/domain
- SEO multi-tenant base:
  - metadatos por tenant y página
  - `robots.txt` por host
  - `sitemap.xml` por host
- motor inicial de landing por secciones
- booking público base:
  - servicios
  - disponibilidad
  - creación de reserva
- auth admin con JWT + refresh
- guards admin por tenant membership
- panel admin base con login, dashboard y gestión inicial de:
  - servicios
  - staff
  - reservas
  - branding
  - SEO general
  - páginas y secciones
  - agenda
- migración inicial y seed demo

## Tenant demo

- host demo: `paolamendozanails.quicklysites.local`
- usuario admin: `admin@quicklysites.local`
- password admin: `Admin123*`

## Instalación

```bash
npm install
```

## Migraciones

```bash
npm run typeorm -w @quickly-sites/api -- migration:run
```

## Seed

```bash
npm run seed -w @quickly-sites/api
```

## Desarrollo

Backend:

```bash
npm run dev:api
```

Admin:

```bash
npm run dev:admin
```

Public site:

```bash
npm run dev:public
```

## URLs esperadas

- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`
- Admin: `http://localhost:5173`
- Public: `http://localhost:5174`

## Endpoints públicos base

- `GET /api/public/site?host=paolamendozanails.quicklysites.local`
- `GET /api/public/services?host=paolamendozanails.quicklysites.local`
- `GET /api/public/availability?host=paolamendozanails.quicklysites.local&serviceId=...&date=2026-04-10`
- `POST /api/public/appointments?host=paolamendozanails.quicklysites.local`
- `GET /api/public/robots.txt?host=paolamendozanails.quicklysites.local`
- `GET /api/public/sitemap.xml?host=paolamendozanails.quicklysites.local`

## Próximos pasos recomendados

- completar CRUDs admin restantes
- agregar guards de membresía por tenant
- endurecer validaciones y paginación
- mejorar renderer de bloques y variantes
- agregar notificaciones y dominios custom con flujo más completo
