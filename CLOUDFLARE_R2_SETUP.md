# Cloudflare R2 Setup

Objetivo:

- subir archivos desde el admin con URL firmada de escritura
- servir assets públicos del sitio y del admin directamente desde Cloudflare R2
- evitar tráfico de salida cobrado por S3 para imágenes públicas

## Enfoque definido

- escrituras: URL prefirmada `PUT`
- lecturas públicas: dominio público de R2
- lecturas privadas: URL firmada temporal

Eso significa que:

- branding, imágenes del sitio y assets públicos de secciones deben guardarse como `public`
- el backend resolverá esos archivos contra `R2_PUBLIC_BASE_URL`
- no usaremos URLs prefirmadas para imágenes públicas del sitio

## Variables necesarias en `apps/api/.env`

```env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=
R2_REGION=auto
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_PUBLIC_BASE_URL=
R2_PRESIGN_TTL_SECONDS=900
R2_FORCE_PATH_STYLE=false
```

Valores esperados:

- `R2_ACCOUNT_ID`: account id de Cloudflare
- `R2_BUCKET`: bucket R2 que almacenará los assets
- `R2_ACCESS_KEY_ID`: access key del token R2
- `R2_SECRET_ACCESS_KEY`: secret key del token R2
- `R2_ENDPOINT`: normalmente `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `R2_PUBLIC_BASE_URL`: dominio público del bucket, por ejemplo `https://assets.quicklysites.com`

## Configuración recomendada en Cloudflare

### 1. Crear bucket

Usa un bucket único, por ejemplo:

- `quicklysites-assets`

La estructura interna ya la maneja la app:

- `tenants/{tenantId}/branding/...`
- `tenants/{tenantId}/site/...`
- `tenants/{tenantId}/gallery/...`

### 2. Crear credenciales R2

Crea un token R2 con permisos:

- `Object Read & Write`

Si quieres ser más estricto:

- limita el token al bucket usado por Quickly Sites

### 3. Conectar dominio público

Conecta un dominio propio al bucket, por ejemplo:

- `assets.quicklysites.com`

Ese dominio debe quedar en `R2_PUBLIC_BASE_URL`.

No se recomienda `r2.dev` para producción.

### 4. Configurar CORS del bucket

Configura CORS para permitir uploads directos desde los frontends:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5175",
      "http://localhost:5176",
      "http://127.0.0.1:5176",
      "https://admin.quicklysites.com",
      "https://quicklysites.com"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Migración operativa sugerida

1. crear bucket R2
2. configurar token y dominio público
3. actualizar `.env` del API
4. reiniciar backend
5. subir nuevos assets desde el admin
6. validar que los assets públicos salen por `R2_PUBLIC_BASE_URL`

## Validación esperada

### Upload

El admin debe seguir subiendo con:

- `POST /api/files/presign-upload`
- luego `PUT` directo a R2

### Delivery público

Los assets públicos resueltos por backend deben salir así:

```text
https://assets.quicklysites.com/tenants/<tenantId>/site/2026-04-03/archivo.webp
```

Y no así:

```text
https://bucket.s3.amazonaws.com/...
```

Ni así:

```text
https://...X-Amz-Signature=...
```

para imágenes públicas.

## Notas

- para assets privados todavía sí se pueden usar URLs firmadas
- si no defines `R2_PUBLIC_BASE_URL`, el backend hará fallback a URL firmada de lectura
- la app usa SDK S3-compatible de AWS, pero apuntando al endpoint de R2
