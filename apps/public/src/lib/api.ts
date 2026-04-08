import { PublicSiteConfig } from '@quickly-sites/shared';

function resolveApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000/api';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }

  return 'https://api.quicklyecsites.com/api';
}

const API_URL = resolveApiUrl();
const DEFAULT_HOST = import.meta.env.VITE_SITE_HOST ?? 'paolamendozanails.quicklyecsites.com';

async function request<T>(path: string) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`);
  } catch {
    throw new Error('No se pudo establecer conexión con el servidor.');
  }

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function normalizeSiteConfig(value: PublicSiteConfig): PublicSiteConfig {
  const pageSections = Array.isArray(value.page?.sections) ? value.page.sections : [];
  const globalSections = Array.isArray(value.globalSections)
    ? value.globalSections
    : pageSections.filter((section) => section.type === 'header' || section.type === 'footer');

  return {
    ...value,
    globalSections,
    page: {
      ...value.page,
      sections: pageSections,
    },
  };
}

export function resolveCurrentHost() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return DEFAULT_HOST;
  }
  return host;
}

export function getSiteConfig(slug = '/') {
  const host = resolveCurrentHost();
  return request<PublicSiteConfig>(`/public/site?host=${host}&slug=${encodeURIComponent(slug)}`).then(normalizeSiteConfig);
}

export function getAvailability(serviceId: string, date: string, staffId?: string) {
  const host = resolveCurrentHost();
  const staffQuery = staffId ? `&staffId=${staffId}` : '';
  return request<{ start: string; end: string; staffId?: string | null }[]>(
    `/public/availability?host=${host}&serviceId=${serviceId}&date=${date}${staffQuery}`,
  );
}

export function createAppointment(payload: unknown) {
  const host = resolveCurrentHost();
  return fetch(`${API_URL}/public/appointments?host=${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json();
  }).catch((error: unknown) => {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('No se pudo establecer conexión con el servidor.');
  });
}
