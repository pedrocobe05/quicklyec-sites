import { CSSProperties, PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { PublicSiteConfig, SITE_FONT_OPTIONS } from '@quickly-sites/shared';
import { getLocalizedPath, resolveRouteKey, usePublicCopy, usePublicLanguage } from '../lib/public-language';

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

function buildWhatsappHref(rawNumber?: string | null) {
  const normalized = String(rawNumber ?? '').trim();
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/[^\d]/g, '');
  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}`;
}

export function Layout({
  site,
  children,
}: PropsWithChildren<{ site: PublicSiteConfig }>) {
  const location = useLocation();
  const navigate = useNavigate();
  const copy = usePublicCopy();
  const { language } = usePublicLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuMounted, setIsMobileMenuMounted] = useState(false);
  const mobileMenuCloseTimer = useRef<number | null>(null);
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
      (showBooking ? copy.layout.bookingEnabled : copy.layout.informationalSite),
  );
  const footerText = String(globalFooter?.content.text ?? globalFooter?.content.body ?? `${site.tenant.name} · ${copy.template.poweredBy}`);
  const footerAddress = String(globalFooter?.content.address ?? '');
  const footerHours = String(globalFooter?.content.hours ?? '');
  const footerInstagram = String(globalFooter?.content.instagram ?? '');
  const footerWhatsapp = String(globalFooter?.content.footerWhatsapp ?? site.tenant.whatsappNumber ?? '');
  const whatsappHref = buildWhatsappHref(footerWhatsapp);
  const logoUrl = site.theme.logoUrl ?? null;
  const tenantCustomCss = resolveTenantCustomCss(theme.customCss);
  const currentRouteKey = resolveRouteKey(location.pathname);
  const navItems = [
    { to: getLocalizedPath('home', language), label: copy.nav.home },
    { to: getLocalizedPath('services', language), label: copy.nav.services },
    ...(showBooking ? [{ to: getLocalizedPath('booking', language), label: copy.nav.booking }] : []),
    { to: getLocalizedPath('contact', language), label: copy.nav.contact },
  ];
  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 transition ${
      isActive
        ? 'bg-[var(--secondary)] text-slate-900 shadow-sm'
        : 'hover:bg-[var(--secondary)] hover:text-slate-900'
    }`;
  const mobileNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `rounded-2xl px-4 py-3 transition ${
      isActive
        ? 'bg-[var(--secondary)] text-slate-900 shadow-sm'
        : 'hover:bg-[var(--secondary)] hover:text-slate-900'
    }`;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (mobileMenuCloseTimer.current !== null) {
      window.clearTimeout(mobileMenuCloseTimer.current);
      mobileMenuCloseTimer.current = null;
    }

    if (isMobileMenuOpen) {
      setIsMobileMenuMounted(true);
      return;
    }

    if (isMobileMenuMounted) {
      mobileMenuCloseTimer.current = window.setTimeout(() => {
        setIsMobileMenuMounted(false);
        mobileMenuCloseTimer.current = null;
      }, 180);
    }

    return () => {
      if (mobileMenuCloseTimer.current !== null) {
        window.clearTimeout(mobileMenuCloseTimer.current);
        mobileMenuCloseTimer.current = null;
      }
    };
  }, [isMobileMenuMounted, isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!currentRouteKey) {
      return;
    }

    const nextPath = getLocalizedPath(currentRouteKey, language);
    if (location.pathname !== nextPath) {
      navigate(`${nextPath}${location.search}`, { replace: true });
    }
  }, [currentRouteKey, language, location.pathname, location.search, navigate]);

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
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4 md:py-5">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
              {logoUrl ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-[var(--secondary)] shadow-sm sm:h-12 sm:w-12 md:h-14 md:w-14">
                  <img src={logoUrl} alt={headerTitle} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-[var(--secondary)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--accent)] shadow-sm sm:h-12 sm:w-12 sm:text-[0.65rem] md:h-14 md:w-14 md:text-sm md:tracking-[0.3em]">
                  QS
                </div>
              )}
              <div className="min-w-0">
                {headerKicker ? (
                  <p className="text-[0.56rem] uppercase tracking-[0.28em] text-[var(--accent)] sm:text-[0.62rem] sm:tracking-[0.32em] md:text-[0.68rem] md:tracking-[0.34em]">
                    {headerKicker}
                  </p>
                ) : null}
                <p className="truncate font-serif text-[1.3rem] font-semibold leading-tight text-slate-900 sm:text-2xl md:text-3xl">
                  {headerTitle}
                </p>
                <p className="truncate text-[0.72rem] leading-snug text-slate-500 sm:text-sm">{headerSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <nav className="hidden flex-wrap items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm md:flex">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={navLinkClassName}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-slate-900 shadow-sm transition hover:bg-[var(--secondary)] md:hidden"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-public-navigation"
                aria-label={isMobileMenuOpen ? copy.menu.close : copy.menu.open}
                onClick={() => setIsMobileMenuOpen((current) => !current)}
              >
                <span className="sr-only">{isMobileMenuOpen ? copy.menu.close : copy.menu.open}</span>
                <span className="relative block h-4 w-5">
                  <span
                    className={`absolute left-0 top-0 h-0.5 w-full rounded-full bg-current transition duration-200 ${
                      isMobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-[7px] h-0.5 w-full rounded-full bg-current transition duration-200 ${
                      isMobileMenuOpen ? 'opacity-0' : ''
                    }`}
                  />
                  <span
                    className={`absolute left-0 top-[14px] h-0.5 w-full rounded-full bg-current transition duration-200 ${
                      isMobileMenuOpen ? 'translate-y-[-7px] -rotate-45' : ''
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
          {isMobileMenuMounted ? (
            <div
              id="mobile-public-navigation"
              className={`mt-4 origin-top md:hidden ${
                isMobileMenuOpen ? 'animate-[mobile-menu-in_180ms_cubic-bezier(0.22,1,0.36,1)]' : 'animate-[mobile-menu-out_180ms_cubic-bezier(0.22,1,0.36,1)]'
              }`}
            >
              <nav className="grid gap-2 rounded-[1.5rem] border border-black/5 bg-white/95 p-3 text-sm font-medium text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={mobileNavLinkClassName}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          ) : null}
        </div>
      </header>
      {isMobileMenuMounted ? (
        <button
          type="button"
          className={`fixed inset-0 z-10 cursor-default bg-black/20 backdrop-blur-[1px] md:hidden ${
            isMobileMenuOpen ? 'animate-[mobile-backdrop-in_180ms_ease-out]' : 'animate-[mobile-backdrop-out_180ms_ease-out]'
          }`}
          aria-label={copy.menu.close}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      ) : null}
      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          aria-label={copy.template.whatsappCta}
          className={`fixed bottom-5 right-5 z-20 inline-flex items-center gap-3 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,211,102,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1fb156] ${
            isMobileMenuOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.198.297-.767.967-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.058-.174-.297-.019-.457.13-.606.136-.134.297-.347.446-.52.15-.174.198-.298.298-.496.099-.198.05-.372-.025-.52-.075-.15-.67-1.611-.916-2.206-.242-.579-.487-.5-.67-.51l-.57-.01c-.198 0-.52.074-.792.372-.273.298-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.15.198 2.095 3.2 5.077 4.487.71.306 1.263.488 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.718 2.006-1.411.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12.004 2C6.479 2 2 6.358 2 11.736c0 1.93.585 3.74 1.597 5.253L2 22l5.16-1.557c1.45.764 3.09 1.168 4.844 1.168 5.525 0 10.004-4.358 10.004-9.736C22.008 6.358 17.53 2 12.004 2zm0 17.78c-1.58 0-3.072-.416-4.364-1.18l-.313-.185-3.06.924.972-2.895-.203-.307a7.56 7.56 0 0 1-1.215-4.1c0-4.595 3.83-8.33 8.183-8.33 4.353 0 8.184 3.735 8.184 8.33 0 4.596-3.83 8.33-8.184 8.33z" />
            </svg>
          </span>
          <span className="hidden sm:inline">{copy.template.whatsappCta}</span>
        </a>
      ) : null}
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
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--accent)]">{copy.layout.footerNavigation}</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `transition ${isActive ? 'text-slate-900' : 'hover:text-slate-900'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-[var(--accent)]">{copy.layout.footerDetails}</p>
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
