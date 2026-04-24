# Planes de Producto

Documento de referencia para alinear backend, panel administrativo, sitio público, automatizaciones y futuras reglas comerciales.

## Regla base

El comportamiento efectivo del producto debe respetar siempre:

`plan activo del tenant + configuración habilitada`

Eso significa:

- si el plan no incluye una capacidad, no debe mostrarse ni operar aunque exista configuración interna
- si el plan sí incluye una capacidad, todavía puede deshabilitarse desde configuración del tenant cuando aplique

## Plan Starter

Precio: `$9.99/mes`

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
- panel administrativo operativo
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

## Plan Pro

Precio: `$19.99/mes`

Enfoque:

- operación completa del negocio

Incluye todo lo del plan Starter, más:

- sistema de reservas online
- agenda digital y bloqueos
- panel administrativo completo
- gestión de clientes
- usuarios y roles del tenant
- notificaciones automáticas por correo
- recordatorios de citas
- estadísticas del negocio
- optimización SEO inicial

Capacidades esperadas:

- sitio público activo
- las mismas `3` páginas base: `Inicio`, `Servicios` y `Contacto`
- reservas online activables
- agenda y bloqueos
- clientes, usuarios y roles
- recordatorios de cita
- plantillas de correo operativas
- reportes y estadísticas
- capacidades extra de SEO

## Reglas funcionales obligatorias

### Sitio público

- todos los planes comparten `Inicio`, `Servicios` y `Contacto` como base mínima
- ambos planes tienen las mismas capacidades de páginas públicas
- `starter`: no debe mostrar ni permitir reservas online
- `pro`: sí puede mostrar y permitir reservas online

### Panel del tenant

- `starter`: no debe exponer módulos operativos de agenda, reservas, clientes, usuarios o roles
- `pro`: sí debe exponer operación completa, automatizaciones y extras

### Automatizaciones

- recordatorios automáticos: solo `pro`
- correo de bienvenida y restablecimiento: disponible solo para tenants con panel operativo (`pro`)
