# Planes de Producto

Documento de referencia para alinear backend, panel administrativo, sitio público, automatizaciones y futuras reglas comerciales.

## Regla base

El comportamiento efectivo del producto debe respetar siempre:

`plan activo del tenant + configuración habilitada`

Eso significa:

- si el plan no incluye una capacidad, no debe mostrarse ni operar aunque exista configuración interna
- si el plan sí incluye una capacidad, todavía puede deshabilitarse desde configuración del tenant cuando aplique

## Plan Básico

Precio: `$10/mes`

Enfoque:

- presencia digital inicial
- visibilidad online

Incluye:

- landing profesional con `3` páginas base:
  - `Inicio`
  - `Servicios`
  - `Contacto`
- sin páginas adicionales fuera de esas `3` base
- hasta `6` secciones distribuidas dentro de esas páginas base
- información del negocio
- servicios
- ubicación y contacto
- botón directo a WhatsApp
- hosting incluido
- subdominio `quicklyecsites`

No incluye:

- reservas online
- agenda digital
- panel administrativo operativo para citas
- gestión de clientes
- recordatorios automáticos
- estadísticas
- SEO premium

Capacidades esperadas:

- sitio público activo
- `3` páginas base obligatorias: `Inicio`, `Servicios` y `Contacto`
- navegación informativa
- sin panel operativo para agenda o clientes
- sin ruta pública de reservas operativa
- sin CTA de reservas

Sugerencias futuras opcionales:

- galería
- testimonios
- preguntas frecuentes
- promociones
- mapa/ubicación avanzada

## Plan Pro

Precio: `$20/mes`

Enfoque:

- operación interna del negocio

Incluye todo lo del plan básico, más:

- sistema de reservas online
- agenda digital
- panel administrativo
- gestión de clientes

Capacidades esperadas:

- sitio público activo
- las mismas `3` páginas base: `Inicio`, `Servicios` y `Contacto`
- hasta `6` páginas en total
- reservas online activables
- agenda y bloqueos
- clientes
- usuarios del tenant
- roles del tenant
- la diferencia principal frente a `basic` está en el backoffice, no en más páginas públicas

## Plan Premium

Precio: `$30/mes`

Enfoque:

- operación optimizada y crecimiento

Incluye todo lo del plan Pro, más:

- notificaciones automáticas por correo
- recordatorios de citas
- estadísticas del negocio
- optimización SEO inicial

Capacidades esperadas:

- todo lo del plan Pro
- las mismas `3` páginas base públicas
- hasta `10` páginas en total
- recordatorios de cita
- plantillas de correo operativas
- capacidades extra de SEO
- reportes/estadísticas

## Reglas funcionales obligatorias

### Sitio público

- todos los planes comparten `Inicio`, `Servicios` y `Contacto` como base mínima
- `basic`: no permite crear páginas adicionales
- `pro`: permite páginas adicionales hasta llegar a `6`
- `premium`: permite páginas adicionales hasta llegar a `10`
- `basic`: no debe mostrar ni permitir reservas online
- `pro` y `premium`: sí pueden mostrar y permitir reservas online

### Panel del tenant

- `basic`: no debe exponer módulos operativos de agenda, reservas, clientes, usuarios o roles
- `pro`: sí debe exponer operación completa base
- `premium`: sí debe exponer operación completa más automatizaciones y extras

### Automatizaciones

- recordatorios automáticos: solo `premium`
- correo de bienvenida y restablecimiento: disponible para tenants con panel operativo

## Implementación recomendada

Al aplicar reglas de producto:

1. validar siempre el plan en backend
2. ocultar también en frontend
3. no confiar solo en flags manuales del tenant

La fuente de verdad principal debe ser el plan.
