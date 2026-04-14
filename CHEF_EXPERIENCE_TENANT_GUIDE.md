# Guía de Tenant: Chef de Autor a Domicilio

Documento para crear manualmente un nuevo tenant en Quickly Sites, pensado para un chef que ofrece experiencias privadas de cocina de autor en casa del cliente.

## Concepto del negocio

No es un restaurante.

No es catering masivo.

Es una experiencia privada, refinada y muy personalizada:

- el chef va a casa del cliente
- cocina en vivo
- diseña una velada completa
- convierte una comida en una experiencia premium

## Propuesta de marca

Nombre sugerido del demo:

- `Atelier Privé`

Otras opciones:

- `Casa Fuego`
- `Mesa de Autor`
- `Private Table by [Nombre del chef]`

## Dirección visual

La estética debe sentirse:

- editorial
- sobria
- gastronómica
- íntima
- premium

Evitar:

- look de restaurante genérico
- colores chillones
- layouts de catering corporativo

## Paleta sugerida

- fondo base: `#F5F1EA`
- carbón: `#181512`
- vino oscuro: `#5B2C2C`
- cobre: `#A4673F`
- crema cálido: `#E9DCCB`

## Tipografía sugerida

- principal: `Cormorant Garamond`
- secundaria: `Manrope`

Si en branding puedes configurar fuente:

- `fontFamily`: `Cormorant Garamond`

## Assets recomendados

Sube estos archivos y usa esos nombres:

- `hero-chef.jpg`
- `hero-table-detail.jpg`
- `experience-fire.jpg`
- `experience-plating.jpg`
- `service-intimate-dinner.jpg`
- `service-tasting-menu.jpg`
- `service-chef-table.jpg`
- `contact-ambient.jpg`
- `chef-portrait.jpg`

## Qué buscar para las imágenes

- `private chef fine dining at home`
- `chef plating gourmet dish dark editorial`
- `luxury dinner table home experience`
- `chef cooking with flame premium`
- `intimate tasting dinner elegant home`
- `private chef portrait dark background`

## Flujo recomendado en la plataforma

## Paso 1. Crear el tenant

En la plataforma:

1. crea un nuevo tenant
2. nombre sugerido: `Atelier Privé`
3. slug sugerido: `atelierprive`
4. plan recomendado: `premium`

## Paso 2. Configuración básica

Configura al menos:

- email de contacto
- teléfono
- WhatsApp
- dirección comercial base
- timezone: `America/Guayaquil`
- moneda: `USD`

## Paso 3. Branding

Configura:

- color principal: `#181512`
- color secundario: `#E9DCCB`
- color acento: `#A4673F`
- fuente: `Cormorant Garamond`
- borde redondeado: `1.5rem`
- estilo de botón: `pill`

## Paso 4. Páginas

Crea estas páginas:

- `home`
- `servicios`
- `contacto`

## Paso 5. Header y footer global

Header sugerido:

- kicker: `Experiencias privadas`
- title: `Atelier Privé`
- subtitle: `Cocina de autor a domicilio para cenas íntimas, celebraciones especiales y veladas memorables.`
- ctaLabel: `Solicitar experiencia`
- ctaUrl: `/contacto`

Footer sugerido:

- text: `Experiencias gastronómicas privadas diseñadas para convertir una cena en un recuerdo inolvidable.`
- address: `Quito, Ecuador · Servicio a domicilio con reserva previa`
- hours: `Reservas con anticipación · Atención personalizada`
- instagram: `@atelierprive.ec`
- footerWhatsapp: `+593 99 000 0000`

## Estructura de contenido

## Inicio

Bloques recomendados:

1. `hero-chef-editorial`
2. `experience-manifesto`
3. `signature-services-chef`

## Servicios

Bloques recomendados:

1. `services-hero-chef`
2. `services-grid-chef`
3. `services-note-chef`

## Contacto

Bloques recomendados:

1. `contact-chef-intro`
2. `contact-chef-cta`

---

# Página: Inicio

## Bloque 1: `hero-chef-editorial`

```html
<section class="chef-hero">
  <div class="chef-hero__copy">
    <span class="chef-eyebrow">Private dining experience</span>
    <h1>El lujo de una cocina de autor, llevada directamente a tu mesa.</h1>
    <p>
      Atelier Privé transforma una cena en casa en una experiencia íntima,
      sofisticada y profundamente memorable. Menú curado, ejecución en vivo y
      atención a cada detalle.
    </p>
    <div class="chef-hero__actions">
      <a href="/servicios" class="chef-btn chef-btn--primary">Explorar experiencias</a>
      <a href="/contacto" class="chef-btn chef-btn--secondary">Solicitar propuesta</a>
    </div>
  </div>
  <div class="chef-hero__visual">
    <div class="chef-hero__shot">
      <img src="{{asset:hero-chef}}" alt="Chef preparando una experiencia gastronómica privada" />
    </div>
    <article class="chef-note">
      <span class="chef-eyebrow">Diseñado para</span>
      <strong>Noches especiales</strong>
      <p>Cenas privadas, aniversarios, celebraciones íntimas y experiencias gastronómicas en casa.</p>
    </article>
  </div>
</section>
```

```css
& .chef-hero {
  display: grid;
  gap: 1.5rem;
  align-items: stretch;
}
@media (min-width: 980px) {
  & .chef-hero {
    grid-template-columns: 1.05fr 0.95fr;
  }
}
& .chef-hero__copy,
& .chef-hero__shot,
& .chef-note {
  border-radius: 2rem;
  border: 1px solid rgba(24, 21, 18, 0.08);
  box-shadow: 0 28px 80px rgba(24, 21, 18, 0.08);
}
& .chef-hero__copy {
  padding: clamp(2rem, 4vw, 4rem);
  background:
    radial-gradient(circle at top left, rgba(164,103,63,0.09), transparent 38%),
    linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,241,234,0.98));
}
& .chef-eyebrow {
  display: inline-block;
  margin-bottom: 1rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.34em;
  color: #8a5d3b;
}
& h1 {
  margin: 0;
  color: #181512;
  font-size: clamp(2.5rem, 5vw, 5.4rem);
  line-height: 0.93;
}
& p {
  margin: 1.5rem 0 0;
  color: #4d463f;
  font-size: 1.04rem;
  line-height: 1.95;
  max-width: 58ch;
}
& .chef-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 2rem;
}
& .chef-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0 1.35rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.92rem;
}
& .chef-btn--primary {
  background: #181512;
  color: #ffffff;
}
& .chef-btn--secondary {
  background: rgba(255,255,255,0.84);
  border: 1px solid rgba(24,21,18,0.12);
  color: #181512;
}
& .chef-hero__visual {
  display: grid;
  gap: 1.5rem;
}
& .chef-hero__shot {
  overflow: hidden;
  min-height: 34rem;
  background: #e9dccb;
}
& .chef-hero__shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
& .chef-note {
  padding: 1.75rem;
  background: linear-gradient(180deg, rgba(248,241,235,0.98), rgba(233,220,203,0.95));
}
& .chef-note strong {
  display: block;
  color: #181512;
  font-size: 2rem;
  line-height: 1;
}
```

## Bloque 2: `experience-manifesto`

```html
<section class="chef-manifesto">
  <div class="chef-manifesto__media">
    <img src="{{asset:hero-table-detail}}" alt="Mesa elegante para experiencia gastronómica privada" />
  </div>
  <article class="chef-manifesto__copy">
    <span class="chef-eyebrow">La experiencia</span>
    <h2>No se trata solo de comer bien. Se trata de vivir una velada extraordinaria.</h2>
    <p>
      Cada servicio está diseñado para crear atmósfera, conversación, sorpresa y
      memoria. Desde la llegada del chef hasta el último plato, todo está
      pensado para ofrecer una experiencia que se sienta exclusiva y personal.
    </p>
  </article>
</section>
```

```css
& .chef-manifesto {
  display: grid;
  gap: 1.5rem;
}
@media (min-width: 920px) {
  & .chef-manifesto {
    grid-template-columns: 0.9fr 1.1fr;
    align-items: stretch;
  }
}
& .chef-manifesto__media,
& .chef-manifesto__copy {
  border-radius: 2rem;
  overflow: hidden;
  border: 1px solid rgba(24,21,18,0.08);
  background: rgba(255,255,255,0.95);
  box-shadow: 0 18px 50px rgba(24,21,18,0.06);
}
& .chef-manifesto__media img {
  width: 100%;
  height: 100%;
  min-height: 22rem;
  object-fit: cover;
  display: block;
}
& .chef-manifesto__copy {
  padding: clamp(1.75rem, 3vw, 3rem);
}
& h2 {
  margin: 0;
  color: #181512;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 0.98;
}
```

## Bloque 3: `signature-services-chef`

```html
<section class="chef-signature-services">
  <header>
    <span class="chef-eyebrow">Formatos destacados</span>
    <h2>Tres formas de vivir la cocina de autor en casa.</h2>
  </header>
  <div class="chef-signature-services__grid">
    <article>
      <img src="{{asset:service-intimate-dinner}}" alt="Cena íntima privada" />
      <strong>Cena íntima de autor</strong>
      <p>Experiencia curada para parejas o grupos pequeños con atmósfera refinada y servicio personalizado.</p>
    </article>
    <article>
      <img src="{{asset:service-tasting-menu}}" alt="Menú degustación privado" />
      <strong>Menú degustación</strong>
      <p>Secuencia de platos pensada para sorprender, conversar y convertir la cena en un momento memorable.</p>
    </article>
    <article>
      <img src="{{asset:service-chef-table}}" alt="Chef's table privado" />
      <strong>Chef's table en casa</strong>
      <p>Ideal para celebraciones privadas y experiencias exclusivas donde el proceso también forma parte del espectáculo.</p>
    </article>
  </div>
</section>
```

```css
& .chef-signature-services {
  border: 1px solid rgba(24,21,18,0.08);
  border-radius: 2rem;
  padding: clamp(1.5rem, 3vw, 2.5rem);
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,241,234,0.95));
  box-shadow: 0 18px 50px rgba(24,21,18,0.06);
}
& .chef-signature-services h2 {
  margin: 0;
  max-width: 16ch;
  color: #181512;
  font-size: clamp(1.9rem, 4vw, 3.2rem);
  line-height: 1.02;
}
& .chef-signature-services__grid {
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
}
@media (min-width: 920px) {
  & .chef-signature-services__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
& .chef-signature-services article {
  overflow: hidden;
  border-radius: 1.5rem;
  background: #f8f4ee;
}
& .chef-signature-services article img {
  width: 100%;
  height: 14rem;
  object-fit: cover;
  display: block;
}
& .chef-signature-services article strong,
& .chef-signature-services article p {
  display: block;
  padding-left: 1.35rem;
  padding-right: 1.35rem;
}
& .chef-signature-services article strong {
  padding-top: 1.25rem;
  color: #181512;
  font-size: 1.2rem;
}
& .chef-signature-services article p {
  padding-bottom: 1.35rem;
  margin: 0.7rem 0 0;
  color: #534a43;
  line-height: 1.8;
}
```

---

# Página: Servicios

## Bloque 1: `services-hero-chef`

```html
<section class="chef-services-hero">
  <span class="chef-eyebrow">Experiencias disponibles</span>
  <h1>Cada servicio está pensado para sentirse íntimo, sofisticado y profundamente personal.</h1>
  <p>
    Aquí no se elige solo un menú. Se elige el tono de la noche, el ritmo del
    encuentro y la experiencia que quieres vivir con tus invitados.
  </p>
</section>
```

```css
& .chef-services-hero {
  border-radius: 2rem;
  padding: clamp(2rem, 4vw, 4rem);
  border: 1px solid rgba(24,21,18,0.08);
  background:
    radial-gradient(circle at top right, rgba(164,103,63,0.11), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,241,234,0.96));
  box-shadow: 0 24px 80px rgba(24,21,18,0.06);
}
& .chef-services-hero h1 {
  margin: 0;
  max-width: 14ch;
  color: #181512;
  font-size: clamp(2.3rem, 4.8vw, 4.8rem);
  line-height: 0.96;
}
& .chef-services-hero p {
  margin-top: 1.25rem;
  max-width: 64ch;
  color: #524841;
  line-height: 1.9;
}
```

## Bloque 2: `services-note-chef`

```html
<div class="chef-services-note">
  <div class="chef-services-note__lead">
    <span class="chef-eyebrow">Importante</span>
    <strong>Cada propuesta puede personalizarse según ocasión, número de invitados y estilo de experiencia.</strong>
  </div>
  <div class="chef-services-note__copy">
    <p>
      El sitio puede presentar los servicios base de forma elegante, mientras el
      cierre comercial ocurre con una propuesta personalizada enviada después del
      contacto.
    </p>
  </div>
</div>
```

```css
& .chef-services-note {
  display: grid;
  gap: 1.25rem;
  border-radius: 2rem;
  padding: 1.5rem;
  border: 1px solid rgba(24,21,18,0.08);
  background: linear-gradient(180deg, rgba(91,44,44,0.06), rgba(164,103,63,0.08));
}
@media (min-width: 860px) {
  & .chef-services-note {
    grid-template-columns: 0.95fr 1.05fr;
    align-items: center;
  }
}
& .chef-services-note strong {
  color: #181512;
  font-size: 1.35rem;
  line-height: 1.35;
}
& .chef-services-note p {
  margin: 0;
  color: #4f4740;
  line-height: 1.85;
}
```

---

# Página: Contacto

## Bloque 1: `contact-chef-intro`

```html
<section class="chef-contact-intro">
  <div class="chef-contact-intro__copy">
    <span class="chef-eyebrow">Reservas privadas</span>
    <h1>Cuéntanos qué ocasión quieres celebrar y diseñaremos una experiencia a tu medida.</h1>
    <p>
      Comparte la fecha tentativa, el tipo de reunión, el número de invitados y
      cualquier detalle especial. La propuesta final se adapta al contexto de tu
      noche.
    </p>
  </div>
  <div class="chef-contact-intro__media">
    <img src="{{asset:contact-ambient}}" alt="Ambiente de cena privada elegante" />
  </div>
</section>
```

```css
& .chef-contact-intro {
  display: grid;
  gap: 1.5rem;
}
@media (min-width: 960px) {
  & .chef-contact-intro {
    grid-template-columns: 1fr 0.9fr;
    align-items: stretch;
  }
}
& .chef-contact-intro__copy,
& .chef-contact-intro__media {
  border-radius: 2rem;
  overflow: hidden;
  border: 1px solid rgba(24,21,18,0.08);
  box-shadow: 0 18px 50px rgba(24,21,18,0.06);
}
& .chef-contact-intro__copy {
  padding: clamp(1.8rem, 4vw, 3.5rem);
  background: rgba(255,255,255,0.96);
}
& .chef-contact-intro__copy h1 {
  margin: 0;
  color: #181512;
  font-size: clamp(2.2rem, 4.6vw, 4.2rem);
  line-height: 0.98;
}
& .chef-contact-intro__copy p {
  margin-top: 1.3rem;
  color: #524941;
  line-height: 1.9;
}
& .chef-contact-intro__media img {
  width: 100%;
  height: 100%;
  min-height: 24rem;
  object-fit: cover;
  display: block;
}
```

## Bloque 2: `contact-chef-cta`

```html
<section class="chef-contact-cta">
  <article>
    <span class="chef-eyebrow">Ideal para</span>
    <ul>
      <li>Aniversarios y ocasiones especiales</li>
      <li>Cenas privadas de autor</li>
      <li>Encuentros íntimos con invitados</li>
      <li>Experiencias gastronómicas memorables en casa</li>
    </ul>
  </article>
  <article>
    <span class="chef-eyebrow">Respuesta</span>
    <p>
      El contacto puede cerrarse por formulario, WhatsApp o correo, según cómo
      prefieras llevar la fase comercial inicial.
    </p>
  </article>
</section>
```

```css
& .chef-contact-cta {
  display: grid;
  gap: 1rem;
}
@media (min-width: 860px) {
  & .chef-contact-cta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
& .chef-contact-cta article {
  border-radius: 1.75rem;
  padding: 1.5rem;
  border: 1px solid rgba(24,21,18,0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,241,234,0.95));
}
& .chef-contact-cta ul {
  margin: 1rem 0 0;
  padding-left: 1.1rem;
  color: #514842;
  line-height: 1.9;
}
& .chef-contact-cta p {
  margin: 1rem 0 0;
  color: #514842;
  line-height: 1.9;
}
```

---

# Orden recomendado de carga

## Inicio

1. `hero-chef-editorial`
2. `experience-manifesto`
3. `signature-services-chef`

## Servicios

1. `services-hero-chef`
2. catálogo base de servicios del sistema
3. `services-note-chef`

## Contacto

1. `contact-chef-intro`
2. formulario/contacto base del sistema
3. `contact-chef-cta`

## Siguiente paso recomendado

No intentes construir todo de una vez.

Hazlo así:

1. crea el tenant
2. configura branding
3. sube imágenes
4. arma `Inicio`
5. revisa visual
6. luego arma `Servicios`
7. por último `Contacto`

## Cómo seguimos

La forma correcta de avanzar contigo es:

1. creas el tenant
2. me dices cuando llegues a `Inicio`
3. te voy guiando bloque por bloque
4. luego pasamos a `Servicios`
5. y finalmente a `Contacto`
