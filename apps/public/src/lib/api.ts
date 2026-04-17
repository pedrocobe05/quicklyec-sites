import { PublicSiteConfig } from '@quickly-sites/shared';
import { getPublicCopy, resolvePreferredPublicLanguage } from './public-language';

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
    const copy = getPublicCopy(resolvePreferredPublicLanguage());
    return `${copy.api.requestFailed} (${status}).`;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      message?: string | string[];
      payphoneHttpStatus?: number;
      payphoneRawBody?: string;
      payphoneParsed?: unknown;
    };
    let base: string;
    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      base = parsed.message.join(', ');
    } else if (typeof parsed.message === 'string' && parsed.message.trim()) {
      base = parsed.message.trim();
    } else {
      base = trimmed;
    }
    if (parsed.payphoneRawBody) {
      const head = `[Payphone HTTP ${parsed.payphoneHttpStatus ?? '?'}]\n`;
      return `${base}\n\n${head}${parsed.payphoneRawBody}`;
    }
    if (parsed.payphoneParsed !== undefined) {
      try {
        return `${base}\n\n[Payphone JSON]\n${JSON.stringify(parsed.payphoneParsed, null, 2)}`;
      } catch {
        return base;
      }
    }
    return base;
  } catch {
    return trimmed;
  }
}

async function request<T>(path: string, options?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(getPublicCopy(resolvePreferredPublicLanguage()).api.connectionFailed);
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

/**
 * Origen (esquema + host + puerto) para URLs de retorno/cancelación de Payphone.
 * Por defecto es `window.location.origin` (p. ej. `http://localhost:5176`).
 * Si en Payphone registraste otro dominio, define `VITE_PUBLIC_APP_ORIGIN` con ese origen
 * (y abre el sitio con ese host, p. ej. vía `/etc/hosts`).
 */
export function resolvePublicAppOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_APP_ORIGIN;
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/$/, '');
  }
  return window.location.origin;
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
  return request<{
    id: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    startDateTime: string;
    endDateTime: string;
  }>(`/public/appointments?host=${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildIdempotencyHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

export function preparePayphonePayment(payload: unknown) {
  const host = resolveCurrentHost();
  return request<{
    clientTransactionId: string;
    payphoneFlow?: 'redirect' | 'box';
    redirectUrl: string;
    amount?: number;
    currency?: string;
    reference?: string;
    payWithPayPhone?: string | null;
    payWithCard?: string | null;
    payphonePrepare?: Record<string, unknown>;
    payphonePrepareRaw?: string | null;
  }>(`/public/payphone/prepare?host=${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildIdempotencyHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

/** `clientTxId` = mismo valor que `clientTransactionId` en la query de retorno de Payphone (doc cajita, consultar respuesta). */
export function confirmPayphonePayment(payload: { id: string; clientTxId: string }) {
  const host = resolveCurrentHost();
  return request<{
    status: 'pending' | 'approved' | 'cancelled' | 'failed';
    appointmentId?: string | null;
    clientTransactionId: string;
    transaction?: Record<string, unknown> | null;
    payphoneConfirmRaw?: string;
  }>(`/public/payphone/confirm?host=${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildIdempotencyHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

/** Persiste el JSON de `V2/Confirm` obtenido en el navegador (sin que el API vuelva a llamar a Payphone). */
export function applyPayphoneClientConfirm(payload: { id: string; clientTxId: string; confirmPayload: Record<string, unknown> }) {
  const host = resolveCurrentHost();
  return request<{
    status: 'pending' | 'approved' | 'cancelled' | 'failed';
    appointmentId?: string | null;
    clientTransactionId: string;
    transaction?: Record<string, unknown> | null;
    payphoneConfirmRaw?: string | null;
  }>(`/public/payphone/apply-confirm?host=${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildIdempotencyHeaders(),
    },
    body: JSON.stringify(payload),
  });
}
