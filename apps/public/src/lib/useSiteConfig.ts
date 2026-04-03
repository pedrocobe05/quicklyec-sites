import { useEffect, useState } from 'react';
import { PublicSiteConfig } from '@quickly-sites/shared';
import { getSiteConfig } from './api';

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

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href =
      data.page.seo.canonicalUrl ??
      `https://${data.domain.canonicalHost}${data.page.isHome ? '' : `/${data.page.slug}`}`;
  }, [data]);

  return { data, loading, error };
}
