/**
 * Payphone Cajita de Pagos — carga perezosa de CSS + SDK (documentación v1.1).
 * El bundle oficial asigna `window.PPaymentButtonBox` (no exporta un módulo ES con nombre).
 * @see https://docs.payphone.app/cajita-de-pagos-payphone
 */

const PAYPHONE_BOX_CSS = 'https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.css';
const PAYPHONE_BOX_JS = 'https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js';

const CSS_LINK_ID = 'payphone-payment-box-css';
const SCRIPT_ID = 'payphone-payment-box-js';

type PPaymentButtonBoxCtor = new (opts: Record<string, unknown>) => { render: (containerId: string) => unknown };

declare global {
  interface Window {
    PPaymentButtonBox?: PPaymentButtonBoxCtor;
  }
}

let stylesPromise: Promise<void> | null = null;
let scriptPromise: Promise<void> | null = null;

/**
 * Convierte el teléfono a estilo E.164 (+código país…). La cajita Payphone rechaza formatos locales (p. ej. 09… sin +593).
 * Prioridad Ecuador: celular 09XXXXXXXX / 9XXXXXXXX → +5939XXXXXXXX.
 */
export function normalizePayphonePhoneNumber(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    return '';
  }
  const compact = trimmed.replace(/\s/g, '');
  if (compact.startsWith('+')) {
    const digits = compact.slice(1).replace(/\D/g, '');
    return digits.length >= 8 ? `+${digits}` : '';
  }
  let digits = compact.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 9 && digits.startsWith('9')) {
    return `+593${digits}`;
  }
  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return '';
}

export function isPlausiblePayphoneE164(value: string): boolean {
  return /^\+[1-9]\d{8,14}$/.test(value);
}

function ensurePayphoneBoxStyles(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }
  if (document.getElementById(CSS_LINK_ID)) {
    return Promise.resolve();
  }
  if (!stylesPromise) {
    stylesPromise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.id = CSS_LINK_ID;
      link.rel = 'stylesheet';
      link.href = PAYPHONE_BOX_CSS;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('No se pudo cargar payphone-payment-box.css'));
      document.head.appendChild(link);
    });
  }
  return stylesPromise;
}

/**
 * El .js del CDN es un bundle clásico que define `window.PPaymentButtonBox`.
 * `import(url)` no recibe exportaciones con nombre; hay que inyectar <script>.
 */
function ensurePayphoneBoxScript(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }
  if (typeof window.PPaymentButtonBox === 'function') {
    return Promise.resolve();
  }
  if (document.getElementById(SCRIPT_ID) && scriptPromise) {
    return scriptPromise;
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID);
      if (existing) {
        const deadline = Date.now() + 20_000;
        const tick = () => {
          if (typeof window.PPaymentButtonBox === 'function') {
            resolve();
            return;
          }
          if (Date.now() > deadline) {
            reject(new Error('Timeout esperando PPaymentButtonBox en window'));
            return;
          }
          window.requestAnimationFrame(tick);
        };
        tick();
        return;
      }

      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = PAYPHONE_BOX_JS;
      script.onload = () => {
        if (typeof window.PPaymentButtonBox === 'function') {
          resolve();
          return;
        }
        reject(new Error('El SDK de Payphone no definió window.PPaymentButtonBox tras cargar el script'));
      };
      script.onerror = () => reject(new Error('No se pudo cargar payphone-payment-box.js'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

async function getPPaymentButtonBox(): Promise<PPaymentButtonBoxCtor> {
  await ensurePayphoneBoxStyles();
  await ensurePayphoneBoxScript();
  const Ctor = window.PPaymentButtonBox;
  if (typeof Ctor !== 'function') {
    throw new Error('PPaymentButtonBox no está disponible en window');
  }
  return Ctor;
}

export type MountPayphoneBoxParams = {
  containerId: string;
  token: string;
  storeId: string;
  clientTransactionId: string;
  /** Monto total en centavos (como en el backend: precio * 100). */
  amount: number;
  currency: string;
  reference: string;
  lang: 'es' | 'en';
  /** Zona horaria (Ecuador continental: -5). */
  timeZone: number;
  email?: string;
  phoneNumber?: string;
};

/**
 * Instancia la cajita en el elemento `#containerId`. Los montos siguen la documentación Payphone (enteros en centavos).
 */
export async function mountPayphonePaymentBox(params: MountPayphoneBoxParams): Promise<{ destroy: () => void }> {
  const PPaymentButtonBox = await getPPaymentButtonBox();

  const container = document.getElementById(params.containerId);
  if (!container) {
    throw new Error(`No existe el contenedor #${params.containerId} para la cajita Payphone`);
  }
  container.innerHTML = '';

  const opts: Record<string, unknown> = {
    token: params.token,
    storeId: params.storeId,
    clientTransactionId: params.clientTransactionId,
    amount: params.amount,
    amountWithoutTax: params.amount,
    currency: params.currency,
    reference: params.reference,
    lang: params.lang,
    timeZone: params.timeZone,
    defaultMethod: 'card',
  };
  if (params.email?.trim()) {
    opts.email = params.email.trim();
  }
  const phone = normalizePayphonePhoneNumber(params.phoneNumber ?? '');
  if (phone && isPlausiblePayphoneE164(phone)) {
    opts.phoneNumber = phone;
  }

  const instance = new PPaymentButtonBox(opts);
  instance.render(params.containerId);

  return {
    destroy: () => {
      const el = document.getElementById(params.containerId);
      if (el) {
        el.innerHTML = '';
      }
    },
  };
}
