Quiero que construyas un producto SaaS nuevo para QuicklyEC, separado del ERP, orientado a crear sitios públicos multi-tenant con reservas online. Este producto NO forma parte del ERP; es otro producto independiente. Su objetivo inicial es servir a negocios tipo nails/spa, pero la arquitectura debe quedar lista para soportar otras verticales en el futuro como veterinaria, clínica, barbería, etc., sin rehacer el core.

## Nombre del producto
Quickly Sites

## Objetivo del producto
Permitir que múltiples clientes (tenants) tengan:
1. Un sitio público tipo landing page.
2. Un sistema de reservas online.
3. Un panel administrativo para gestionar contenido, reservas, agenda, clientes y notificaciones.

Debe ser un SaaS multi-tenant real. No quiero una app distinta por cliente. Quiero un solo frontend público y un solo backend que resuelvan el tenant por dominio/host y devuelvan una configuración diferente por tenant.

---

# Requerimiento principal de arquitectura

## Separación total respecto al ERP
Este proyecto debe ser completamente separado del ERP Quickly:
- backend separado
- frontend admin separado
- frontend público separado o bien claramente desacoplado dentro del mismo producto
- base de datos separada
- despliegue separado
- autenticación propia para admins del producto

## Stack deseado
Quiero la solución con esta base tecnológica:
- Backend: NestJS
- ORM: TypeORM
- DB: PostgreSQL
- Frontend admin: React + Vite + TypeScript
- Frontend público: React + Vite + TypeScript
- UI: TailwindCSS
- Validación: class-validator / class-transformer en backend y zod o equivalente en frontend
- Autenticación admin: JWT con refresh tokens
- Emails: dejar integración preparada por provider abstracto (ej. Resend/SES/Nodemailer adapter), sin acoplar el core
- Arquitectura limpia, modular y mantenible
- Swagger en backend
- README completo
- Seed inicial
- Variables de entorno bien definidas
- ESLint + Prettier

No quiero un monolito desordenado. Quiero una arquitectura modular, clara y extensible.

---

# Modelo de negocio y alcance funcional

## Producto Quickly Sites tendrá estos micro-módulos:
1. Tenants
2. Dominios
3. Branding / Theme
4. Templates de landing
5. Secciones / bloques de landing
6. Contenido editable por tenant
7. Servicios reservables
8. Staff / recursos
9. Agenda / disponibilidad
10. Reservas
11. Clientes
12. Notificaciones
13. Usuarios admin y roles
14. Configuración del sitio público

## Vertical inicial
El primer template funcional debe ser:
- beauty / nails / spa

Pero la arquitectura debe permitir agregar luego:
- vet-clinic
- medical-booking
- barber
- restaurant landing
- cualquier otro template futuro

---

# Multi-tenancy

## Resolución del tenant
El tenant debe resolverse por el host/domain del request público.

Ejemplos:
- paolamendozanails.quicklysites.com
- paolamendozanails.com
- www.paolamendozanails.com
- globalveterinary.quicklysites.com
- globalveterinary.com

El backend debe tener una tabla de dominios por tenant para mapear:
host -> tenant

No quiero que el tenant se determine manualmente por query param inseguro.

## Panel admin
El panel admin puede vivir bajo algo como:
- admin.quicklysites.com
o
- sites.quicklyec.com

En admin, el tenant debe validarse por membresía del usuario autenticado, no solo por host.

## SEO multi-tenant
El SEO también debe manejarse de forma multi-tenant.

Cada tenant debe poder tener su propia configuración SEO sin afectar a otros tenants:
- dominio primario y canonical por tenant
- metadatos SEO por página
- Open Graph / social sharing por página
- indexación configurable por tenant y por página
- sitemap.xml y robots.txt resueltos por host

No quiero SEO global hardcodeado para toda la plataforma pública.
El frontend público debe construir los metadatos en función del tenant resuelto por host y de la página solicitada.

---

# Entidades principales que quiero

Diseña correctamente las entidades y relaciones. Como base, quiero al menos:

## Core tenancy
- Tenant
  - id
  - name
  - slug
  - status
  - plan
  - createdAt
  - updatedAt

- TenantDomain
  - id
  - tenantId
  - domain
  - type (subdomain | custom)
  - isPrimary
  - verificationStatus
  - verifiedAt
  - sslStatus
  - createdAt
  - updatedAt

- TenantSetting
  - id
  - tenantId
  - publicSiteEnabled
  - bookingEnabled
  - timezone
  - locale
  - currency
  - contactEmail
  - contactPhone
  - whatsappNumber
  - siteIndexingEnabled
  - defaultSeoTitle optional
  - defaultSeoDescription optional
  - defaultOgImageUrl optional
  - canonicalDomain optional

- TenantBranding
  - id
  - tenantId
  - logoUrl
  - faviconUrl
  - primaryColor
  - secondaryColor
  - accentColor
  - fontFamily
  - borderRadius
  - buttonStyle
  - customCss optional

## Templates y landing engine
- SiteTemplate
  - id
  - code (beauty-nails, vet-clinic, etc.)
  - name
  - description
  - isActive

- SitePage
  - id
  - tenantId
  - templateId
  - slug
  - title
  - isHome
  - isPublished
  - isIndexable
  - seoTitle
  - seoDescription
  - canonicalUrl optional
  - ogTitle optional
  - ogDescription optional
  - ogImageUrl
  - metaRobots optional

- SiteSection
  - id
  - pageId
  - type (hero, about, services, gallery, testimonials, booking_cta, map, faq, footer, etc.)
  - variant
  - position
  - isVisible
  - settings jsonb
  - content jsonb

- SiteMedia
  - id
  - tenantId
  - url
  - alt
  - type
  - metadata jsonb

## Booking core
- Service
  - id
  - tenantId
  - name
  - description
  - durationMinutes
  - price optional
  - isActive
  - category optional
  - color optional

- Staff
  - id
  - tenantId
  - name
  - bio
  - avatarUrl
  - email optional
  - phone optional
  - isBookable
  - isActive

- StaffService
  - id
  - staffId
  - serviceId

- AvailabilityRule
  - id
  - tenantId
  - staffId nullable
  - dayOfWeek
  - startTime
  - endTime
  - slotIntervalMinutes
  - isActive

- ScheduleBlock
  - id
  - tenantId
  - staffId nullable
  - startDateTime
  - endDateTime
  - reason
  - blockType

- Customer
  - id
  - tenantId
  - fullName
  - email
  - phone
  - notes optional
  - tags jsonb optional

- Appointment
  - id
  - tenantId
  - customerId
  - serviceId
  - staffId nullable
  - source (public_site | admin | imported)
  - status (pending | confirmed | cancelled | completed | no_show)
  - startDateTime
  - endDateTime
  - notes optional
  - internalNotes optional
  - createdAt
  - updatedAt

## Notifications
- NotificationTemplate
- NotificationLog

## Admin users
- AdminUser
- TenantMembership
- Role / Permission simplificado

No quiero sobreingeniería innecesaria, pero sí una base seria.

---

# Reglas de diseño importantes

## 1. No contaminar el core de reservas
No quiero campos específicos de una industria en el booking core.
NO poner cosas como:
- petId
- doctorId
- nailTechnicianId
- roomNumber
directamente en Appointment.

El motor de reservas debe ser genérico:
- service
- staff/resource
- availability
- appointment
- customer

Las particularidades futuras de verticales se resolverán con módulos/extensions aparte.

## 2. Landing engine configurable
No quiero una landing hardcodeada por cliente.
Quiero:
- un template inicial beauty-nails
- theme por tenant
- catálogo de bloques reutilizables
- orden configurable de secciones
- variantes por sección
- contenido editable por tenant

## 3. No construir un page builder estilo Elementor
Quiero un sistema controlado, no un editor visual libre infinito.
MVP correcto:
- 1 template inicial
- catálogo de bloques
- branding configurable
- contenido editable
- activación/desactivación de secciones
- orden de secciones
- variantes de bloque

---

# Funcionalidad pública requerida

## Sitio público
Quiero un frontend público que:
- detecte el host actual
- consulte al backend la configuración pública del tenant
- renderice la landing según:
  - branding
  - template
  - sections
  - content
  - services
- resuelva metadatos SEO por tenant y por página
- soporte rutas públicas al menos para:
  - /
  - /reservar
  - /servicios
  - /contacto
  - páginas adicionales si aplica

## SEO público requerido
Quiero que el sitio público soporte como mínimo:
- title y meta description por tenant/página
- canonical correcto según host y dominio primario
- Open Graph y Twitter card básicos
- robots.txt por tenant
- sitemap.xml por tenant
- noindex configurable para tenants o páginas no publicadas/no indexables

Si un tenant usa dominio custom, el SEO debe responder coherentemente para ese host y evitar conflictos de canonical con subdominios secundarios.

## Booking público
Debe permitir:
- listar servicios disponibles
- seleccionar servicio
- seleccionar staff si aplica
- consultar disponibilidad
- escoger fecha/hora
- ingresar datos del cliente
- crear reserva
- mostrar confirmación

## Reglas mínimas del booking
- calcular slots según availability rules
- excluir schedule blocks
- excluir slots ya ocupados
- controlar duración del servicio
- impedir solapamientos
- timezone consistente
- validaciones robustas

---

# Funcionalidad admin requerida

Quiero un panel administrativo completo para el tenant.

## Admin debe permitir:
1. Login/logout/refresh token
2. Gestión básica del tenant
3. Gestión de branding:
   - logo
   - colores
   - tipografía
   - favicon
4. Gestión del sitio:
   - seleccionar template
   - editar páginas
   - activar/desactivar secciones
   - cambiar orden
   - editar contenido de cada bloque
5. Gestión de servicios
6. Gestión de staff
7. Gestión de horarios/disponibilidad
8. Gestión de bloqueos de agenda
9. Gestión de reservas
10. Gestión de clientes
11. Configuración de notificaciones
12. Gestión de dominios
13. Vista previa del sitio
14. Configuración SEO por tenant y por página

## Gestión de dominios
Debe existir un módulo donde el admin vea:
- subdominio por defecto del tenant
- dominios personalizados conectados
- estado de verificación
- si es primario o no

No hace falta automatizar de forma real toda la provisión DNS, pero sí quiero:
- modelo de datos
- endpoints
- flujo funcional
- estado de validación simulado o preparado para implementación real

---

# Template inicial beauty / nails / spa

Quiero que implementes un template inicial real y usable, no solo estructura vacía.

## Debe incluir como mínimo estos bloques:
- Hero
- About
- Services grid
- Services carousel opcional
- Gallery
- Testimonials
- Booking CTA
- Contact / map
- Footer

## Variantes mínimas
- Hero: al menos 2 variantes
- Services: al menos 2 variantes
- Testimonials: al menos 2 variantes

## Contenido demo seed
Crear seed inicial para un tenant demo tipo:
- Paola Mendoza Nails

Con:
- branding femenino/elegante
- varios servicios
- imágenes placeholder
- testimonios demo
- horarios demo
- dominio demo:
  - paolamendozanails.quicklysites.local

---

# API backend requerida

## Endpoints públicos
Diseña endpoints públicos como mínimo para:
- resolver sitio por host
- obtener configuración pública del sitio
- listar servicios públicos
- consultar disponibilidad
- crear reserva pública
- obtener robots.txt por host
- obtener sitemap.xml por host

## Endpoints privados
Diseña endpoints autenticados para:
- auth
- tenant profile
- branding
- pages
- sections
- services
- staff
- availability
- schedule blocks
- appointments
- customers
- domains
- notification settings

Quiero DTOs bien hechos, validaciones, paginación en listados y Swagger bien organizado.

---

# Seguridad
- JWT access + refresh
- guards
- separación clara entre endpoints públicos y privados
- validación de pertenencia del usuario al tenant
- no exponer datos de un tenant a otro
- sanitizar inputs
- rate limit básico en endpoints públicos de booking
- CORS configurable
- headers seguros si aplica

---

# Calidad técnica
Quiero:
- arquitectura por módulos en NestJS
- services pequeños
- repositories claros
- entidades bien normalizadas
- evitar lógica inflada
- nombres consistentes
- manejo de errores correcto
- logger
- health check
- configuración por env
- seeds
- migraciones
- README con setup completo

---

# Frontend público
Quiero un frontend público bien estructurado, no improvisado.

## Debe tener:
- resolución del host actual
- llamada al backend para obtener site config
- renderer de template
- renderer de secciones por tipo/variant
- theming dinámico por tenant
- SEO dinámico por tenant/página
- página de reservas
- UX limpia y responsive
- loading states
- manejo de errores si host no existe o sitio no está publicado

## Estructura
Quiero componentes reutilizables por bloque:
- HeroSection
- ServicesSection
- GallerySection
- TestimonialsSection
- BookingCTASection
- ContactSection
etc.

Y un TemplateRenderer que reciba la config y renderice.

---

# Frontend admin
Quiero panel admin usable y suficientemente completo.

## Módulos visibles:
- Dashboard
- Sitio web
- Branding
- Servicios
- Staff
- Agenda
- Reservas
- Clientes
- Dominios
- Configuración

## Requisitos del admin
- layout con sidebar
- tabla y formularios
- formularios validados
- experiencia limpia
- preview/public link
- filtros básicos para reservas y clientes
- formulario de SEO por tenant y por página

---

# Dominio y host strategy
Quiero dejar el proyecto listo para este modelo:
- Admin: admin.quicklysites.com
- Público por defecto: {slug}.quicklysites.com
- Público custom: dominios del cliente como paolamendozanails.com, globalveterinary.com

Implementa la lógica de resolución de tenant por host.
No hace falta integrar realmente AWS Amplify o Cloudflare dentro del código, pero sí quiero que el proyecto quede preparado conceptualmente para que:
- múltiples hosts apunten al mismo frontend público
- el backend resuelva tenant por host
- el sitio renderice distinto por tenant

---

# Entregables que quiero de ti
1. Estructura completa del monorepo o repos separados, según mejor criterio, explicándolo.
2. Backend NestJS funcional.
3. Frontend público funcional.
4. Frontend admin funcional.
5. Base de datos con migraciones.
6. Seed demo.
7. SEO multi-tenant funcional en frontend y backend.
8. README de instalación y arquitectura.
9. Colección de endpoints o guía clara de uso.
10. Swagger.
11. Decisiones técnicas justificadas brevemente dentro del README.

---

# Importante
No quiero solamente scaffolding vacío.
Quiero una primera versión funcional de verdad.

Prioriza:
1. Multi-tenancy correcto
2. Landing engine configurable
3. Booking engine genérico
4. Admin usable
5. Template beauty-nails funcional

Después deja preparado el terreno para crecer.

Si tienes que elegir entre hacer algo enorme pero superficial vs algo más acotado pero bien hecho, prefiero algo más acotado, consistente y ejecutable.

Construye el proyecto completo.
