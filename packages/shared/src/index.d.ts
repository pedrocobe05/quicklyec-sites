export type TenantDomainType = 'subdomain' | 'custom';
export type VerificationStatus = 'pending' | 'verified' | 'failed';
export type SslStatus = 'pending' | 'active' | 'failed';
export type TenantStatus = 'active' | 'inactive' | 'suspended';
export type TenantPlan = 'starter' | 'pro' | 'enterprise';
export type SiteSectionType = 'hero' | 'about' | 'services' | 'gallery' | 'testimonials' | 'booking_cta' | 'contact' | 'footer';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type AppointmentSource = 'public_site' | 'admin' | 'imported';
export interface TenantTheme {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    borderRadius: string;
    buttonStyle: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
}
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
    variant: string;
    position: number;
    isVisible: boolean;
    settings: Record<string, unknown>;
    content: Record<string, unknown>;
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
export interface PublicSiteConfig {
    tenant: {
        id: string;
        name: string;
        slug: string;
        locale: string;
        timezone: string;
        currency: string;
        contactEmail?: string | null;
        contactPhone?: string | null;
        whatsappNumber?: string | null;
    };
    domain: {
        host: string;
        canonicalHost: string;
    };
    theme: TenantTheme;
    page: PublicPage;
    services: PublicService[];
    staff: PublicStaff[];
}
export interface AvailabilitySlot {
    start: string;
    end: string;
    staffId?: string | null;
    staffName?: string | null;
}
export interface CreatePublicAppointmentInput {
    serviceId: string;
    staffId?: string | null;
    startDateTime: string;
    customer: {
        fullName: string;
        email: string;
        phone: string;
        notes?: string | null;
    };
    notes?: string | null;
}
