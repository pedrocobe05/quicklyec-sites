import { CSSProperties, PropsWithChildren, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PublicSiteConfig, SITE_FONT_OPTIONS } from '@quickly-sites/shared';

function resolveTenantCustomCss(customCss?: string | null) {
  const normalized = String(customCss ?? '').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.includes('&')) {
    return normalized.replace(/&/g, '.public-theme');
  }

  if (!normalized.includes('{') && normalized.includes(':')) {
    return `.public-theme { ${normalized} }`;
  }

  return normalized;
}

export function Layout({
  site,
  children,
}: PropsWithChildren<{ site: PublicSiteConfig }>) {
  const location = useLocation();
  const theme = site.theme;
  const resolvedFontFamily =
    SITE_FONT_OPTIONS.find((font) => font.value === theme.fontFamily)?.cssFamily
    ?? `"${theme.fontFamily}", serif`;
  const resolvedButtonRadius = theme.buttonStyle === 'soft-square'
    ? '0.7rem'
    : theme.buttonStyle === 'rounded'
      ? '1rem'
      : '999px';
  const showBooking = site.capabilities.bookingEnabled;
  const globalSections = useMemo(() => {
    const currentGlobals = Array.isArray(site.globalSections) ? site.globalSections : [];
    if (currentGlobals.length > 0) {
      return currentGlobals;
    }

    const pageSections = Array.isArray(site.page?.sections) ? site.page.sections : [];
    return pageSections.filter((section) => section.type === 'header' || section.type === 'footer');
  }, [site.globalSections, site.page?.sections]);
  const globalHeader = globalSections.find((section) => section.type === 'header' && section.isVisible);
  const globalFooter = globalSections.find((section) => section.type === 'footer' && section.isVisible);
  const globalHtmlSections = globalSections.filter((section) => section.type === 'custom_html' && section.isVisible);
  const headerTitle = String(globalHeader?.content.title ?? site.tenant.name);
  const headerKicker = String(globalHeader?.content.kicker ?? '').trim();
  const headerSubtitle = String(
    globalHeader?.content.subtitle ??
      globalHeader?.content.body ??
      (showBooking ? 'Sitio y reservas online' : 'Sitio informativo del negocio'),
  );
  const footerText = String(globalFooter?.content.text ?? globalFooter?.content.body ?? `${site.tenant.name} · Powered by Quickly Sites`);
  const footerAddress = String(globalFooter?.content.address ?? '');
  const footerHours = String(globalFooter?.content.hours ?? '');
  const footerInstagram = String(globalFooter?.content.instagram ?? '');
  const footerWhatsapp = String(globalFooter?.content.footerWhatsapp ?? site.tenant.whatsappNumber ?? '');
  const logoUrl = site.theme.logoUrl ?? null;
  const tenantCustomCss = resolveTenantCustomCss(theme.customCss);
  const navItems = [
    { to: '/', label: 'Inicio' },
    { to: '/servicios', label: 'Servicios' },
    ...(showBooking ? [{ to: '/reservar', label: 'Reservar' }] : []),
    { to: '/contacto', label: 'Contacto' },
  ];

  return (
    <div
      className="public-theme min-h-screen text-slate-800"
      style={
        {
          '--primary': theme.primaryColor,
          '--secondary': theme.secondaryColor,
          '--accent': theme.accentColor,
          '--radius': theme.borderRadius,
          '--font-family': resolvedFontFamily,
          '--button-radius': resolvedButtonRadius,
          fontFamily: resolvedFontFamily,
        } as CSSProperties
      }
    >
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-[var(--secondary)] shadow-sm">
                <img src={logoUrl} alt={headerTitle} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/5 bg-[var(--secondary)] text-sm uppercase tracking-[0.3em] text-[var(--accent)] shadow-sm">
                QS
              </div>
            )}
            <div>
              {headerKicker ? (
                <p className="text-[0.68rem] uppercase tracking-[0.34em] text-[var(--accent)]">{headerKicker}</p>
              ) : null}
              <p className="font-serif text-3xl font-semibold text-slate-900">{headerTitle}</p>
              <p className="text-sm text-slate-500">{headerSubtitle}</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-4 py-2 transition hover:bg-[var(--secondary)] hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div key={`${location.pathname}${location.search}`} className="public-route-stage animate-route-in">
        {children}
      </div>
      {globalHtmlSections.length > 0 ? (
        <div className="mx-auto mt-10 grid max-w-6xl gap-6 px-6">
          {globalHtmlSections.map((section) => (
            <section
              key={section.id}
              className="rounded-[var(--radius)] bg-white p-8 shadow-sm"
              dangerouslySetInnerHTML={{ __html: String(section.content.html ?? '') }}
            />
          ))}
        </div>
      ) : null}
      <footer className="mt-16 border-t border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,238,232,0.92))]">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.2fr,0.8fr,0.8fr]">
          <div>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-[var(--secondary)] shadow-sm">
                  <img src={logoUrl} alt={headerTitle} className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div>
                <p className="font-serif text-2xl text-slate-900">{headerTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{headerSubtitle}</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">{footerText}</p>
          </div>
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--accent)]">Navegación</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} className="transition hover:text-slate-900">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--accent)]">Detalles</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              {footerAddress ? <p>{footerAddress}</p> : null}
              {footerHours ? <p>{footerHours}</p> : null}
              <p>{site.tenant.contactEmail ?? 'demo@quicklyecsites.local'}</p>
              <p>{site.tenant.contactPhone ?? '+593 999 999 999'}</p>
              {footerWhatsapp ? <p>{footerWhatsapp}</p> : null}
              {footerInstagram ? <p>{footerInstagram}</p> : null}
            </div>
          </div>
        </div>
      </footer>
      {tenantCustomCss ? <style>{tenantCustomCss}</style> : null}
    </div>
  );
}
