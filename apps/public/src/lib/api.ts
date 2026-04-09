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

function createIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildIdempotencyHeaders() {
  return {
    'Idempotency-Key': createIdempotencyKey(),
  };
}

function extractErrorMessage(errorText: string, status: number) {
  const trimmed = errorText.trim();
  if (!trimmed) {
    return `No se pudo completar la solicitud (${status}).`;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: string | string[] };
    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message.join(', ');
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

async function request<T>(path: string, options?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error('No se pudo establecer conexión con el servidor.');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(extractErrorMessage(errorText, response.status));
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
  return request<{
    start: string;
    end: string;
    staffId?: string | null;
    staffName?: string | null;
    available: boolean;
    unavailableReason?: string | null;
  }[]>(
    `/public/availability?host=${host}&serviceId=${serviceId}&date=${date}${staffQuery}`,
  );
}

export function createAppointment(payload: unknown) {
  const host = resolveCurrentHost();
  return request(`/public/appointments?host=${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildIdempotencyHeaders(),
    },
    body: JSON.stringify(payload),
  });
}
