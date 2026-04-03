# Avance del Proyecto

Documento de control para construir `Quickly Sites` por etapas, sin perder visibilidad de lo ya resuelto y lo que falta.

## Estado general

Estado actual: `prototipo funcional comercial`

Ya existe:

- monorepo con `apps/api`, `apps/admin`, `apps/public` y `packages/shared`
- backend NestJS conectado a PostgreSQL
- migración inicial ejecutable
- seed demo ejecutado
- tenant demo `paolamendozanails`
- resolución multi-tenant por host
- frontend público inicial
- panel admin inicial con gestión operable base
- SEO multi-tenant base
- branding, sitio y agenda administrables desde panel
- edición operativa de registros existentes en admin
- clientes administrables
- base de roles/plataforma/planes de suscripción implementada
- primera UI funcional de plataforma para `super_admin`
- creación de tenants desde UI de plataforma
- asignación de admins a tenants desde plataforma
- ocultamiento base de módulos del admin según plan y membership
- roles propios por tenant con rol de sistema `Administrador`
- cálculo de módulos efectivos por plan intersectado con permisos del rol
- restricciones backend por módulo para `site`, `branding`, `domains`, `settings`, `services`, `staff`, `agenda`, `reservas`, `clientes`, `usuarios` y `roles`

## Fases de trabajo

### Fase 1. Fundaciones

Estado: `completada`

Objetivo:

- dejar el proyecto arrancable de punta a punta

Incluye:

- estructura del monorepo
- configuración base de TypeScript, ESLint y Prettier
- apps principales creadas
- contratos compartidos
- conexión a base de datos
- migración inicial
- seed demo

### Fase 2. Core multi-tenant

Estado: `parcial`

Objetivo:

- consolidar el core del SaaS multi-tenant

Ya hecho:

- resolución de tenant por host
- entidades base de tenancy
- dominios por tenant
- settings y branding por tenant
- guards de pertenencia por tenant en endpoints admin clave
- edición de branding y settings SEO/contacto por tenant
- `super_admin` de plataforma con bypass controlado
- planes de suscripción normalizados a `basic / pro / premium`
- roles del tenant y memberships vinculadas a rol real
- base de UI de plataforma en el admin reutilizado
- alta de tenants desde plataforma con settings, branding y dominio base
- asignación de usuarios admin a tenants desde plataforma

Pendiente:

- validación más estricta para evitar cruces entre tenants
- canonical/primary domain administrable desde panel
- UI completa para administración de plataforma
- editor completo de permisos por rol desde UI

### Fase 3. Landing engine

Estado: `parcial`

Objetivo:

- tener un motor de landing configurable pero controlado

Ya hecho:

- `SiteTemplate`, `SitePage`, `SiteSection`
- renderer público por tipo de sección
- template demo beauty/nails
- secciones demo seeded
- CRUD base de páginas
- CRUD base de secciones
- selección de template para páginas desde admin
- secciones con `scope` global/page
- `header` y `footer` globales del sitio
- `custom_html` con HTML y CSS personalizado por tenant
- `custom_html` con múltiples assets por sección mediante placeholders `{{asset:nombre}}`
- home demo del tenant `paolamendozanails` convertida a bloques `custom_html` para mostrar personalización real

Pendiente:

- reordenamiento persistente
- variantes de bloque más completas y formularios específicos por bloque
- preview más real del sitio

### Fase 4. Booking core

Estado: `parcial`

Objetivo:

- motor de reservas genérico y reusable

Ya hecho:

- entidades de servicios, staff, disponibilidad, clientes y reservas
- consulta de disponibilidad pública
- creación de reserva pública
- exclusión básica por citas ya creadas y bloques de agenda
- CRUD admin base de servicios
- CRUD admin base de staff
- actualización de estado de reservas desde admin
- CRUD base de availability rules
- CRUD base de schedule blocks
- edición rápida de reservas existentes
- módulo admin de clientes

Pendiente:

- filtros y paginación en reservas
- validaciones más fuertes de timezone

### Fase 5. SEO multi-tenant

Estado: `parcial`

Objetivo:

- que cada tenant y cada página tenga SEO propio

Ya hecho:

- metadatos SEO por tenant/página
- `robots.txt` por host
- `sitemap.xml` por host
- title y description dinámicos en frontend público
- canonical y metadatos OG básicos inyectados en frontend
- configuración SEO general editable desde admin

Pendiente:

- Twitter cards completas en frontend
- canonical calculado con más reglas
- manejo de páginas no indexables desde admin
- editor SEO por página en admin

### Fase 6. Admin usable

Estado: `parcial`

Objetivo:

- convertir el admin en un panel realmente operable

Ya hecho:

- login base
- dashboard base
- lectura de tenant, dominios, servicios y reservas
- formularios base para crear servicios y staff
- acciones base para eliminar servicios y staff
- acciones base para confirmar, completar o cancelar reservas
- branding editable
- settings SEO/contacto editables
- páginas y secciones administrables
- agenda base administrable
- dominios base administrables
- edición rápida de servicios, staff, páginas, secciones, agenda y clientes
- tabs de empresa para `General`, `Usuarios`, `Roles`, `Marca`, `Dominios`, `Sitio`, `Servicios`, `Agenda`, `Reservas` y `Clientes`
- roles y usuarios del tenant administrables desde detalle de empresa
- logger backend estilo ERP con request id y trazabilidad de errores
- CRUD de roles de plataforma y configuración de plataforma persistida
- base de SMTP por tenant con fallback a `.env`
- envíos de bienvenida y restablecimiento de contraseña mediante correo si SMTP está configurado
- recordatorios automáticos de cita disparados por scheduler backend para planes con esa capacidad
- base de archivos por tenant con S3, presign de subida y URL firmada de acceso
- resolución segura de `logo` y `favicon` públicos cuando se almacenan como referencias internas `file:<id>`
- branding, sitio y galería ya usan subida real a S3 por tenant
- assets múltiples para secciones `custom_html` usando S3
- el admin ya muestra previews reales de branding, páginas y secciones estándar
- las secciones `custom_html` ya no muestran preview de imagen en admin para evitar confusión
- las lecturas de archivos ya salen por URL firmada en lugar de URL pública directa del bucket
- `DashboardPage` legacy retirado del flujo y eliminado del código activo
- reservas administrables desde una sola acción con edición de estado, fecha y notas
- validación backend de reservas para evitar horarios ocupados o bloqueados
- disponibilidad ya no considera citas canceladas, completadas o no asistidas como bloqueantes
- creación y edición de roles del tenant con permisos seleccionables desde UI
- tabs y acciones del tenant ya se ocultan según permisos efectivos del usuario
- el sitio público ya respeta capacidades del plan activo para mostrar o bloquear reservas
- documento de referencia de planes creado en `PRODUCT_PLANS.md`
- al cambiar el plan de un tenant, el backend sincroniza automáticamente capacidades derivadas
- downgrade a `basic` desactiva reservas online y oculta `booking_cta`
- los límites de páginas por plan ya se aplican en backend y admin

Pendiente:

- persistencia de sesión más robusta
- selector de tenant si un usuario tiene varias membresías
- formularios CRUD más completos con edición dedicada
- tablas con filtros y paginación
- separar mejor la navegación entre modo plataforma y modo tenant para admins no plataforma
- UI de carga de archivos para branding/sitio sobre el nuevo módulo S3
- terminar de pulir permisos por rol y ocultamiento fino por acción
- filtros, búsqueda y paginación en tablas operativas
- biblioteca visual de assets por sección con renombre, borrado y reordenamiento
- pulido final del template `nails spa` con assets reales del cliente y header/footer más ricos

### Fase 7. Hardening

Estado: `pendiente`

Objetivo:

- subir el nivel técnico antes de ampliar alcance

Incluye:

- manejo consistente de errores
- logging más estructurado
- rate limit afinado
- tests unitarios y e2e
- sanitización adicional
- validaciones de input más estrictas

## Checklist de avance

### Backend

- [x] NestJS configurado
- [x] TypeORM configurado
- [x] conexión a PostgreSQL
- [x] Swagger activo
- [x] health check
- [x] auth login + refresh
- [x] endpoints públicos base
- [x] seed demo
- [ ] CRUD de branding
- [x] CRUD base de branding/settings por tenant
- [x] CRUD base de páginas
- [x] CRUD base de secciones
- [x] CRUD base de staff
- [x] CRUD base de servicios
- [x] control de tenant membership en endpoints admin clave
- [x] CRUD base de horarios
- [x] CRUD base de bloqueos
- [ ] CRUD de dominios
- [x] CRUD base de dominios
- [ ] notificaciones
- [x] recordatorios automáticos de cita por correo
- [ ] paginación consistente
- [x] módulo admin de clientes
- [x] base de plataforma/planes/roles
- [x] roles por tenant y cálculo de acceso efectivo por plan
- [x] logger backend con request logging y http exception filter
- [x] base de correo SMTP por tenant y fallback global
- [x] base S3 para archivos por tenant con URLs firmadas
- [x] soporte de múltiples assets en `custom_html`
- [x] resolución de assets de frontend/admin mediante URLs firmadas

### Frontend público

- [x] resolución de host
- [x] carga de site config
- [x] renderer inicial
- [x] booking base
- [x] páginas `/`, `/reservar`, `/servicios`, `/contacto`
- [ ] más variantes visuales por bloque
- [ ] SEO completo en head
- [ ] manejo de 404 por tenant/página
- [ ] preview de páginas adicionales

### Frontend admin

- [x] login base
- [x] dashboard base
- [x] lectura de tenant demo
- [x] CRUD base de servicios
- [x] CRUD base de staff
- [x] actualización de estado de reservas
- [x] CRUD base de sitio
- [x] CRUD base de branding
- [x] CRUD base de agenda
- [x] CRUD base de reservas más completo
- [x] CRUD base de clientes
- [x] CRUD base de dominios
- [x] configuración SEO base
- [x] UI base de plataforma para super admin
- [x] creación de tenants desde UI
- [x] asignación de admins y módulos por tenant
- [x] ocultamiento base de módulos según plan/membership
- [x] administración de usuarios del tenant basada en roles
- [x] tab de roles del tenant
- [x] edición de permisos por rol desde UI
- [x] CRUD base de roles de plataforma
- [x] configuración de plataforma persistida

### Base de datos

- [x] migración inicial
- [x] seed demo
- [ ] migraciones incrementales por módulo futuro
- [ ] índices adicionales para performance

## Orden recomendado de implementación

1. Fortalecer flujo de dominio primario y estados de verificación.
2. Agregar filtros, búsqueda y paginación en tablas operativas.
3. Endurecer más validaciones de agenda y reservas.
4. Afinar ocultamiento fino por acción en toda la UI del tenant.
5. Agregar notificaciones base y tests.

## Próximo bloque sugerido

Siguiente sprint recomendado:

- mejora del flujo de dominios y dominio primario
- filtros y paginación
- endurecimiento adicional de reservas y agenda
- pulido final del flujo de galería y assets del sitio

Razón:

- la separación plataforma/tenant ya quedó utilizable sin flujo legacy
- la subida de archivos por tenant ya funciona en branding y sitio
- la siguiente brecha es mejorar operación diaria con filtros, dominios y validaciones más finas

## Notas operativas

- BD actual: `localhost:4533 / quicklysites / postgres / 2412`
- tenant demo: `paolamendozanails.quicklysites.local`
- admin demo: `admin@quicklysites.local`
- password demo: `Admin123*`

## Cómo usar este documento

Cada vez que avancemos:

- marcar tareas completadas
- mover el estado de cada fase
- agregar el siguiente sprint recomendado
- evitar abrir nuevas áreas si la fase anterior sigue a medio cerrar
