import { PublicSiteConfig, SiteSection, SiteSectionAsset } from '@quickly-sites/shared';

function scopeSectionCss(sectionId: string, css: string) {
  const rootClass = `.qs-custom-html-${sectionId}`;
  const normalized = css.trim();

  if (!normalized) {
    return '';
  }

  if (normalized.includes('&')) {
    return normalized.replace(/&/g, rootClass);
  }

  return `${rootClass} { ${normalized} }`;
}

function resolveCustomHtml(section: SiteSection) {
  const html = String(section.content.html ?? '').trim();
  const assets = (Array.isArray(section.content.assets) ? section.content.assets : []) as SiteSectionAsset[];

  if (!html) {
    return '';
  }

  return html.replace(/{{\s*asset:([a-zA-Z0-9._-]+)\s*}}/g, (_match, assetName: string) => {
    const exactFileAsset = assets.find((item) => item.name === assetName && String(item.url ?? '').startsWith('file:'));
    const exactAsset = assets.find((item) => item.name === assetName);
    const aliasFamilyFileAsset = [...assets]
      .reverse()
      .find((item) => item.name.startsWith(`${assetName}-`) && String(item.url ?? '').startsWith('file:'));
    const aliasFamilyAsset = [...assets]
      .reverse()
      .find((item) => item.name.startsWith(`${assetName}-`));

    const asset = exactFileAsset ?? exactAsset ?? aliasFamilyFileAsset ?? aliasFamilyAsset;
    return asset?.url ?? '';
  });
}

function HeroSection({ section }: { section: SiteSection }) {
  return (
    <section className="overflow-hidden rounded-[calc(var(--radius)+0.5rem)] border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,239,233,0.92))] p-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-14">
      <div className="grid gap-8 md:grid-cols-[1.4fr,0.8fr] md:items-end">
        <div>
          {String(section.content.kicker ?? '').trim() ? (
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--accent)]">{String(section.content.kicker ?? '').trim()}</p>
          ) : null}
          <h1 className="mt-4 font-serif text-5xl leading-[0.95] text-slate-900 md:text-7xl">
            {String(section.content.title ?? 'Una presencia digital diseñada para destacar tu marca')}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            {String(section.content.subtitle ?? '')}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-[rgba(15,23,42,0.08)] bg-white/70 p-6 backdrop-blur">
          <p className="text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">Experiencia</p>
          <p className="mt-3 font-serif text-3xl text-slate-900">Diseño editorial y experiencia premium.</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Presentación visual pensada para marcas que quieren verse cuidadas, coherentes y memorables desde el primer contacto.
          </p>
        </div>
      </div>
    </section>
  );
}

function AboutSection({ section }: { section: SiteSection }) {
  return (
    <section className="grid gap-8 rounded-[calc(var(--radius)+0.25rem)] border border-black/5 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:grid-cols-2">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--accent)]">Nosotros</p>
        <h2 className="mt-3 font-serif text-4xl text-slate-900">{String(section.content.title ?? 'Sobre la marca')}</h2>
      </div>
      <p className="text-lg leading-8 text-slate-600">{String(section.content.body ?? '')}</p>
    </section>
  );
}

function ServicesSection({ section, site }: { section: SiteSection; site: PublicSiteConfig }) {
  return (
    <section className="rounded-[calc(var(--radius)+0.25rem)] border border-black/5 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <h2 className="font-serif text-4xl text-slate-900">{String(section.content.title ?? 'Servicios')}</h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {site.services.map((service) => (
          <article key={service.id} className="rounded-[var(--radius)] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#fff,#faf8f5)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>
              </div>
              <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-sm text-slate-700 shadow-sm">
                {service.durationMinutes} min
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function GallerySection({ section }: { section: SiteSection }) {
  const items =
    (section.content.items as { title?: string; imageUrl?: string | null }[] | undefined) ?? [];
  return (
    <section className="rounded-[calc(var(--radius)+0.25rem)] border border-black/5 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <h2 className="font-serif text-4xl text-slate-900">{String(section.content.title ?? 'Galería')}</h2>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {items.map((item, index) => (
          <div key={`${item.title ?? 'gallery-item'}-${index}`} className="aspect-square overflow-hidden rounded-[var(--radius)] bg-[var(--secondary)] p-4">
            <div className="relative flex h-full items-end overflow-hidden rounded-[calc(var(--radius)-0.25rem)] bg-white/50 p-4 text-sm text-slate-700">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title ?? 'Imagen de galería'}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="relative z-10 rounded-full bg-white/80 px-3 py-1.5">
                {item.title ?? 'Imagen'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection({ section }: { section: SiteSection }) {
  const items = (section.content.items as { author: string; text: string }[] | undefined) ?? [];
  return (
    <section className="rounded-[calc(var(--radius)+0.25rem)] bg-[#23201d] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <h2 className="font-serif text-4xl">{String(section.content.title ?? 'Testimonios')}</h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {items.map((item, index) => (
          <blockquote key={`${item.author}-${index}`} className="rounded-[var(--radius)] border border-white/10 bg-white/5 p-6">
            <p className="text-lg leading-7">{item.text}</p>
            <footer className="mt-4 text-sm text-white/70">{item.author}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

function BookingCTASection() {
  return (
    <section className="rounded-[calc(var(--radius)+0.25rem)] bg-[linear-gradient(135deg,var(--primary),var(--accent))] p-8 text-white shadow-[0_24px_80px_rgba(124,58,70,0.18)]">
      <h2 className="font-serif text-4xl">Agenda tu cita online</h2>
      <p className="mt-3 max-w-2xl text-white/80">
        Selecciona tu servicio, revisa disponibilidad y confirma la reserva en pocos pasos.
      </p>
      <a
        href="/reservar"
        className="mt-6 inline-flex rounded-full border border-white/20 bg-[color-mix(in_srgb,var(--secondary)_78%,white)] px-5 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--primary)_80%,#0f172a)]"
      >
        Reservar ahora
      </a>
    </section>
  );
}

function ContactSection({ site }: { site: PublicSiteConfig }) {
  return (
    <section className="rounded-[calc(var(--radius)+0.25rem)] border border-black/5 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <h2 className="font-serif text-4xl text-slate-900">Contacto</h2>
      <div className="mt-6 grid gap-3 text-slate-600">
        <p>Email: {site.tenant.contactEmail ?? 'demo@quicklyecsites.local'}</p>
        <p>Teléfono: {site.tenant.contactPhone ?? '+593 999 999 999'}</p>
        <p>WhatsApp: {site.tenant.whatsappNumber ?? '+593 999 999 999'}</p>
      </div>
    </section>
  );
}

function CustomHtmlSection({ section }: { section: SiteSection }) {
  const html = resolveCustomHtml(section);
  const css = String(section.content.css ?? '').trim();
  const surface = String(section.settings?.surface ?? 'card');

  if (!html) {
    return null;
  }

  return (
    <section
      className={`qs-custom-html-${section.id} ${
        surface === 'raw'
          ? ''
          : 'rounded-[calc(var(--radius)+0.25rem)] border border-black/5 bg-white/90 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]'
      }`}
    >
      {css ? <style>{scopeSectionCss(section.id, css)}</style> : null}
      <div
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export function TemplateRenderer({ site }: { site: PublicSiteConfig }) {
  return (
    <div className="grid gap-8">
      {site.page.sections
        .filter((section) => section.isVisible)
        .map((section) => {
          if (section.type === 'hero') return <HeroSection key={section.id} section={section} />;
          if (section.type === 'about') return <AboutSection key={section.id} section={section} />;
          if (section.type === 'services') {
            return <ServicesSection key={section.id} section={section} site={site} />;
          }
          if (section.type === 'gallery') return <GallerySection key={section.id} section={section} />;
          if (section.type === 'testimonials') {
            return <TestimonialsSection key={section.id} section={section} />;
          }
          if (section.type === 'booking_cta' && site.capabilities.bookingEnabled) return <BookingCTASection key={section.id} />;
          if (section.type === 'booking_cta') return null;
          if (section.type === 'contact') return <ContactSection key={section.id} site={site} />;
          if (section.type === 'footer') return null;
          if (section.type === 'header') return null;
          if (section.type === 'custom_html') return <CustomHtmlSection key={section.id} section={section} />;
          return null;
        })}
    </div>
  );
}
