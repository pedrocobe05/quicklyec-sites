export type TenantDomainType = 'subdomain' | 'custom';
export type VerificationStatus = 'pending' | 'verified' | 'failed';
export type SslStatus = 'pending' | 'active' | 'failed';
export type TenantStatus = 'active' | 'inactive' | 'suspended';
export type TenantPlan = 'basic' | 'pro' | 'premium';
export type SiteSectionType =
  | 'header'
  | 'hero'
  | 'about'
  | 'services'
  | 'gallery'
  | 'testimonials'
  | 'booking_cta'
  | 'contact'
  | 'footer'
  | 'custom_html';
export type SiteSectionScope = 'global' | 'page';
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';
export type AppointmentSource = 'public_site' | 'admin' | 'imported';
export type PaymentMethod = 'cash' | 'transfer' | 'payphone';
export type PayphoneMode = 'redirect' | 'box';

export const SITE_SECTION_TYPES: SiteSectionType[] = [
  'header',
  'hero',
  'about',
  'services',
  'gallery',
  'testimonials',
  'booking_cta',
  'contact',
  'footer',
  'custom_html',
];

export const SITE_SECTION_CATALOG: Array<{
  value: SiteSectionType;
  label: string;
  description: string;
  scope: 'global' | 'page' | 'both';
}> = [
  { value: 'header', label: 'Encabezado', description: 'Encabezado global del sitio compartido por todas las páginas.', scope: 'global' },
  { value: 'hero', label: 'Hero', description: 'Portada principal con título, subtítulo y llamado de atención.', scope: 'page' },
  { value: 'about', label: 'Nosotros', description: 'Bloque descriptivo para presentar el negocio o la marca.', scope: 'page' },
  { value: 'services', label: 'Servicios', description: 'Listado visual de servicios disponibles del tenant.', scope: 'page' },
  { value: 'gallery', label: 'Galería', description: 'Muestra imágenes del negocio, trabajos o resultados.', scope: 'page' },
  { value: 'testimonials', label: 'Testimonios', description: 'Opiniones destacadas de clientes.', scope: 'page' },
  { value: 'booking_cta', label: 'Llamado a reserva', description: 'Bloque para invitar a reservar cuando el plan lo permita.', scope: 'page' },
  { value: 'contact', label: 'Contacto', description: 'Información de contacto, teléfono, correo y WhatsApp.', scope: 'page' },
  { value: 'footer', label: 'Pie de página', description: 'Cierre global del sitio compartido por todas las páginas.', scope: 'global' },
  { value: 'custom_html', label: 'HTML personalizado', description: 'Bloque libre sanitizado para insertar contenido personalizado.', scope: 'both' },
];

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
  buttonStyle: string;
  customCss?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

export const SITE_FONT_OPTIONS: Array<{
  value: string;
  label: string;
  cssFamily: string;
}> = [
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond', cssFamily: '"Cormorant Garamond", serif' },
  { value: 'Playfair Display', label: 'Playfair Display', cssFamily: '"Playfair Display", serif' },
  { value: 'Lora', label: 'Lora', cssFamily: '"Lora", serif' },
  { value: 'Bodoni Moda', label: 'Bodoni Moda', cssFamily: '"Bodoni Moda", serif' },
  { value: 'Prata', label: 'Prata', cssFamily: '"Prata", serif' },
  { value: 'Cormorant Infant', label: 'Cormorant Infant', cssFamily: '"Cormorant Infant", serif' },
  { value: 'DM Sans', label: 'DM Sans', cssFamily: '"DM Sans", sans-serif' },
  { value: 'Manrope', label: 'Manrope', cssFamily: '"Manrope", sans-serif' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville', cssFamily: '"Libre Baskerville", serif' },
  { value: 'Space Grotesk', label: 'Space Grotesk', cssFamily: '"Space Grotesk", sans-serif' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', cssFamily: '"Plus Jakarta Sans", sans-serif' },
  { value: 'Instrument Sans', label: 'Instrument Sans', cssFamily: '"Instrument Sans", sans-serif' },
  { value: 'Fraunces', label: 'Fraunces', cssFamily: '"Fraunces", serif' },
];

export interface SeoConfig {
  title: string;
  description: string;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  metaRobots?: string | null;
}

export interface SiteSection {
  id: string;
  type: SiteSectionType;
  scope: SiteSectionScope;
  variant: string;
  position: number;
  isVisible: boolean;
  settings: Record<string, unknown>;
  content: Record<string, unknown>;
}

export interface SiteSectionAsset {
  name: string;
  url: string;
  fileId?: string | null;
  alt?: string | null;
  label?: string | null;
  kind?: 'image';
}

export interface PublicPage {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  seo: SeoConfig;
  sections: SiteSection[];
}

export interface PublicService {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price?: number | null;
  category?: string | null;
  color?: string | null;
}

export interface PublicStaff {
  id: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  serviceIds?: string[];
}

export interface TenantPaymentSettings {
  cashPaymentEnabled: boolean;
  transferPaymentEnabled: boolean;
  payphonePaymentEnabled: boolean;
  payphoneMode: PayphoneMode;
  /**
   * Solo cuando payphoneMode es `box` y hay credenciales: token + storeId para el SDK de la cajita en el navegador
   * (según documentación Payphone el widget se configura en cliente con dominio permitido).
   */
  payphoneBox: { token: string; storeId: string } | null;
  /**
   * Mismas credenciales cuando Payphone está habilitado y hay token/storeId (cualquier modo).
   * Sirve para `V2/Confirm` desde el navegador en la URL de retorno (doc Payphone).
   */
  payphonePublicApi: { token: string; storeId: string } | null;
}

export interface PublicSiteConfig {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    locale: string;
    timezone: string;
    currency: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    whatsappNumber?: string | null;
    contactAddress?: string | null;
    paymentMethods: TenantPaymentSettings;
  };
  capabilities: {
    publicSiteEnabled: boolean;
    bookingEnabled: boolean;
    features: string[];
    limits: Record<string, number | boolean | null>;
  };
  domain: {
    host: string;
    canonicalHost: string;
  };
  theme: TenantTheme;
  globalSections: SiteSection[];
  page: PublicPage;
  services: PublicService[];
  staff: PublicStaff[];
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  staffId?: string | null;
  staffName?: string | null;
  available: boolean;
  unavailableReason?: string | null;
}

export interface CreatePublicAppointmentInput {
  serviceId: string;
  staffId?: string | null;
  startDateTime: string;
  paymentMethod?: PaymentMethod;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    notes?: string | null;
  };
  notes?: string | null;
}
