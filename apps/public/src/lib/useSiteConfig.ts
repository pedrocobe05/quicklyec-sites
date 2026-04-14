import { useEffect, useState } from 'react';
import { PublicSiteConfig } from '@quickly-sites/shared';
import { getSiteConfig } from './api';
import { emitPublicNotification } from '../shared/notifications/notifications';

export function useSiteConfig(slug = '/') {
  const [data, setData] = useState<PublicSiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSiteConfig(slug)
      .then((value) => {
        setData(value);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
        emitPublicNotification(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!data) {
      return;
    }

    document.title = data.page.seo.title;

    const ensureMeta = (selector: string, assign: (element: HTMLMetaElement) => void) => {
      const existing = document.querySelector<HTMLMetaElement>(selector) ?? document.createElement('meta');
      assign(existing);
      if (!existing.parentNode) {
        document.head.appendChild(existing);
      }
    };

    ensureMeta('meta[name="description"]', (element) => {
      element.name = 'description';
      element.content = data.page.seo.description;
    });

    ensureMeta('meta[property="og:title"]', (element) => {
      element.setAttribute('property', 'og:title');
      element.content = data.page.seo.ogTitle ?? data.page.seo.title;
    });

    ensureMeta('meta[property="og:description"]', (element) => {
      element.setAttribute('property', 'og:description');
      element.content = data.page.seo.ogDescription ?? data.page.seo.description;
    });

    ensureMeta('meta[property="og:image"]', (element) => {
      element.setAttribute('property', 'og:image');
      element.content = data.page.seo.ogImageUrl ?? '';
    });

    ensureMeta('meta[name="robots"]', (element) => {
      element.name = 'robots';
      element.content = data.page.seo.metaRobots ?? 'index,follow';
    });

    ensureMeta('meta[name="theme-color"]', (element) => {
      element.name = 'theme-color';
      element.content = data.theme.primaryColor;
    });

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href =
      data.page.seo.canonicalUrl ??
      `https://${data.domain.canonicalHost}${data.page.isHome ? '' : `/${data.page.slug}`}`;

    const faviconHref = data.theme.faviconUrl?.trim() || '/favicon.ico';

    const ensureLink = (selector: string, rel: string) => {
      const existing = document.querySelector<HTMLLinkElement>(selector) ?? document.createElement('link');
      existing.rel = rel;
      existing.href = faviconHref;
      if (!existing.parentNode) {
        document.head.appendChild(existing);
      }
    };

    ensureLink('link[rel="icon"]', 'icon');
    ensureLink('link[rel="shortcut icon"]', 'shortcut icon');
    ensureLink('link[rel="apple-touch-icon"]', 'apple-touch-icon');
  }, [data]);

  return { data, loading, error };
}
