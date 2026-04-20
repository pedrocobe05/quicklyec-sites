import { Injectable, NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PublicSiteConfig, SeoConfig, SITE_SECTION_TYPES, SiteSectionAsset, SiteSectionScope, SiteSectionType } from '@quickly-sites/shared';
import sanitizeHtml from 'sanitize-html';
import { Repository } from 'typeorm';
import { SitePageEntity, SiteSectionEntity, SiteTemplateEntity, TenantEntity } from 'src/common/entities';
import { ServicesService } from 'src/modules/services/services.service';
import { StaffService } from 'src/modules/staff/staff.service';
import { TenantsService } from 'src/modules/tenants/tenants.service';
import { getPlanAccessDefinition, getPlanMetadata, normalizePlanCode } from 'src/modules/tenants/tenant-access.constants';
import { getTenantSubscriptionState } from 'src/modules/tenants/subscription.utils';
import { FilesService } from 'src/modules/files/files.service';
import { CreatePageDto } from './dto/create-page.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class SiteService {
  constructor(
    @InjectRepository(SitePageEntity)
    private readonly pagesRepository: Repository<SitePageEntity>,
    @InjectRepository(SiteSectionEntity)
    private readonly sectionsRepository: Repository<SiteSectionEntity>,
    @InjectRepository(SiteTemplateEntity)
    private readonly templatesRepository: Repository<SiteTemplateEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
    private readonly tenantsService: TenantsService,
    private readonly servicesService: ServicesService,
    private readonly staffService: StaffService,
    private readonly filesService: FilesService,
  ) {}

  private normalizeSectionType(type: string): SiteSectionType {
    if (!SITE_SECTION_TYPES.includes(type as SiteSectionType)) {
      throw new BadRequestException('Tipo de sección no soportado');
    }

    return type as SiteSectionType;
  }

  private normalizeLocale(value: string | null | undefined) {
    const normalized = String(value ?? '').toLowerCase().trim();
    if (normalized.startsWith('en')) {
      return 'en';
    }
    return 'es';
  }

  private normalizePayphoneMode(value: string | null | undefined) {
    const normalized = String(value ?? '').toLowerCase().trim();
    return normalized === 'box' ? 'box' : 'redirect';
  }

  private sanitizeSectionContent(type: SiteSectionType, content?: Record<string, unknown>) {
    const nextContent = { ...(content ?? {}) };

    if (type === 'custom_html') {
      nextContent.html = sanitizeHtml(String(nextContent.html ?? ''), {
        allowedTags: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'span', 'div', 'section', 'article',
          'strong', 'em', 'u', 'small', 'br', 'hr',
          'ul', 'ol', 'li',
          'a',
          'img',
          'blockquote', 'code', 'pre',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'iframe',
        ],
        allowedAttributes: {
          '*': ['class', 'style'],
          a: ['href', 'name', 'target', 'rel'],
          img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
          iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'title'],
        },
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesByTag: {
          img: ['http', 'https', 'data'],
        },
        allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'www.google.com', 'maps.google.com'],
      });
      nextContent.css = this.sanitizeCustomCss(String(nextContent.css ?? ''));
      nextContent.assets = this.sanitizeSectionAssets(nextContent.assets);
    }

    return nextContent;
  }

  private sanitizeCustomCss(css: string) {
    return css
      .replace(/<\/?style[^>]*>/gi, '')
      .replace(/@import/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, 12000);
  }

  private sanitizeAssetName(name: string) {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  private sanitizeSectionAssets(value: unknown): SiteSectionAsset[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const assets: SiteSectionAsset[] = [];

    for (const asset of value) {
      if (!asset || typeof asset !== 'object') {
        continue;
      }

      const raw = asset as Record<string, unknown>;
      const name = this.sanitizeAssetName(String(raw.name ?? raw.label ?? ''));
      const url = String(raw.url ?? '').trim();
      const fileId = String(raw.fileId ?? '').trim();
      const urlMatch = url.match(/^file:([0-9a-f-]+)$/i);

      if (!name || !url) {
        continue;
      }

      assets.push({
        name,
        url,
        fileId: fileId || urlMatch?.[1] || null,
        alt: String(raw.alt ?? '').trim() || null,
        label: String(raw.label ?? '').trim() || null,
        kind: 'image',
      });
    }

    return assets;
  }

  private normalizeSectionScope(scope?: string): SiteSectionScope {
    return scope === 'global' ? 'global' : 'page';
  }

  private validateSectionScope(type: SiteSectionType, scope: SiteSectionScope) {
    if (scope === 'global' && !['header', 'footer', 'custom_html'].includes(type)) {
      throw new BadRequestException('Este tipo de sección no puede ser global');
    }

    if (scope === 'page' && ['header', 'footer'].includes(type)) {
      throw new BadRequestException('Este tipo de sección solo puede usarse como sección global');
    }
  }

  private async getActiveTemplateId(templateId?: string | null) {
    if (templateId) {
      return templateId;
    }

    const activeTemplate = await this.templatesRepository.findOne({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    if (!activeTemplate) {
      throw new BadRequestException('No active site template available');
    }

    return activeTemplate.id;
  }

  private buildSeo(page: SitePageEntity, fallbackTitle: string, fallbackDescription: string): SeoConfig {
    return {
      title: page.seoTitle ?? fallbackTitle,
      description: page.seoDescription ?? fallbackDescription,
      canonicalUrl: page.canonicalUrl,
      ogTitle: page.ogTitle,
      ogDescription: page.ogDescription,
      ogImageUrl: page.ogImageUrl,
      metaRobots: page.metaRobots ?? (page.isIndexable ? 'index,follow' : 'noindex,nofollow'),
    };
  }

  private ensureActivePublicSubscription(input: {
    subscriptionStartsAt?: string | null;
    subscriptionEndsAt?: string | null;
    timeZone?: string | null;
  }) {
    const subscription = getTenantSubscriptionState(input);
    if (!subscription.isActive) {
      throw new NotFoundException('Public site is disabled');
    }
  }

  async getPublicSiteByHost(host: string, slug = '/') {
    const resolved = await this.tenantsService.resolveTenantByHost(host);
    const tenantId = resolved.tenant.id;
    const normalizedPlan = normalizePlanCode(resolved.tenant.plan);
    const planMetadata = getPlanMetadata(normalizedPlan);
    const bookingEnabled = Boolean((resolved.setting?.bookingEnabled ?? true) && planMetadata.features.includes('online_booking'));
    const publicSiteEnabled = resolved.setting?.publicSiteEnabled ?? true;

    if (!publicSiteEnabled) {
      throw new NotFoundException('Public site is disabled');
    }

    this.ensureActivePublicSubscription({
      subscriptionStartsAt: resolved.tenant.subscriptionStartsAt,
      subscriptionEndsAt: resolved.tenant.subscriptionEndsAt,
      timeZone: resolved.setting?.timezone,
    });

    const pageSlug = slug === '/' ? 'home' : slug.replace(/^\//, '');

    const page = await this.pagesRepository.findOne({
      where: [
        { tenantId, slug: pageSlug, isPublished: true },
        ...(pageSlug === 'home' ? [{ tenantId, isHome: true, isPublished: true }] : []),
      ],
      relations: ['template'],
    });

    if (!page) {
      throw new NotFoundException('Published page not found');
    }

    const [pageSections, globalSections] = await Promise.all([
      this.sectionsRepository.find({
        where: { pageId: page.id, tenantId, scope: 'page' },
        order: { position: 'ASC' },
      }),
      this.sectionsRepository.find({
        where: { tenantId, scope: 'global' },
        order: { position: 'ASC' },
      }),
    ]);

    const services = await this.servicesService.findPublicByTenant(tenantId);
    const staff = await this.staffService.findPublicByTenant(tenantId);

    const tenantLocale = this.normalizeLocale(resolved.setting?.locale);
    const defaultTitle = resolved.setting?.defaultSeoTitle ??
      `${resolved.tenant.name} | ${tenantLocale === 'en' ? 'Online booking' : 'Reservas online'}`;
    const defaultDescription = resolved.setting?.defaultSeoDescription ??
      (tenantLocale === 'en'
        ? `Book services at ${resolved.tenant.name} from its public site.`
        : `Reserva servicios en ${resolved.tenant.name} desde su sitio público.`);

    const canonicalHost = resolved.setting?.canonicalDomain ?? resolved.domain.domain;
    const [logoUrl, faviconUrl] = await Promise.all([
      this.filesService.resolveStoredReference(resolved.branding?.logoUrl, tenantId),
      this.filesService.resolveStoredReference(resolved.branding?.faviconUrl, tenantId),
    ]);

    const [resolvedPageSections, resolvedGlobalSections] = await Promise.all([
      Promise.all(
        pageSections.map(async (section) => ({
          ...section,
          content: await this.filesService.resolveContentAssets(section.content, tenantId),
        })),
      ),
      Promise.all(
        globalSections.map(async (section) => ({
          ...section,
          content: await this.filesService.resolveContentAssets(section.content, tenantId),
        })),
      ),
    ]);

    const resolvedOgImageUrl = await this.filesService.resolveStoredReference(page.ogImageUrl, tenantId);

    const visibleGlobalSections = resolvedGlobalSections.filter((section) => section.isVisible);
    const visibleSections = resolvedPageSections.filter((section) => (
      section.isVisible && (bookingEnabled || section.type !== 'booking_cta')
    ));

    const payphoneMode = this.normalizePayphoneMode(resolved.setting?.payphoneMode);
    const payphoneToken = resolved.setting?.payphoneToken?.trim() ?? '';
    const payphoneStoreId = resolved.setting?.payphoneStoreId?.trim() ?? '';
    const payphoneEnabled = resolved.setting?.payphonePaymentEnabled ?? false;
    const payphoneBoxCredentials =
      payphoneEnabled && payphoneMode === 'box' && payphoneToken && payphoneStoreId
        ? { token: payphoneToken, storeId: payphoneStoreId }
        : null;

    const payphonePublicApi =
      payphoneEnabled && payphoneToken && payphoneStoreId ? { token: payphoneToken, storeId: payphoneStoreId } : null;

    const response: PublicSiteConfig = {
      tenant: {
        id: resolved.tenant.id,
        name: resolved.tenant.name,
        slug: resolved.tenant.slug,
        plan: normalizedPlan,
        locale: tenantLocale,
        timezone: resolved.setting?.timezone ?? 'America/Guayaquil',
        currency: resolved.setting?.currency ?? 'USD',
        contactEmail: resolved.setting?.contactEmail ?? null,
        contactPhone: resolved.setting?.contactPhone ?? null,
        whatsappNumber: resolved.setting?.whatsappNumber ?? null,
        contactAddress: resolved.setting?.contactAddress ?? null,
        paymentMethods: {
          cashPaymentEnabled: resolved.setting?.cashPaymentEnabled ?? true,
          transferPaymentEnabled: resolved.setting?.transferPaymentEnabled ?? false,
          payphonePaymentEnabled: payphoneEnabled,
          payphoneMode,
          payphoneBox: payphoneBoxCredentials,
          payphonePublicApi,
        },
      },
      capabilities: {
        publicSiteEnabled,
        bookingEnabled,
        features: [...planMetadata.features],
        limits: { ...planMetadata.limits },
      },
      domain: {
        host: resolved.domain.domain,
        canonicalHost,
      },
      theme: {
        primaryColor: resolved.branding?.primaryColor ?? '#D89AA5',
        secondaryColor: resolved.branding?.secondaryColor ?? '#F5E8EA',
        accentColor: resolved.branding?.accentColor ?? '#A86172',
        fontFamily: resolved.branding?.fontFamily ?? 'Playfair Display',
        borderRadius: resolved.branding?.borderRadius ?? '1rem',
        buttonStyle: resolved.branding?.buttonStyle ?? 'rounded',
        customCss: this.sanitizeCustomCss(String(resolved.branding?.customCss ?? '')) || null,
        logoUrl,
        faviconUrl,
      },
      globalSections: visibleGlobalSections.map((section) => ({
        id: section.id,
        type: section.type as PublicSiteConfig['page']['sections'][number]['type'],
        scope: section.scope,
        variant: section.variant,
        position: section.position,
        isVisible: section.isVisible,
        settings: section.settings,
        content: section.content,
      })),
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        isHome: page.isHome,
        seo: this.buildSeo(page, defaultTitle, defaultDescription),
        sections: visibleSections.map((section) => ({
          id: section.id,
          type: section.type as PublicSiteConfig['page']['sections'][number]['type'],
          scope: section.scope,
          variant: section.variant,
          position: section.position,
          isVisible: section.isVisible,
          settings: section.settings,
          content: section.content,
        })),
      },
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price ? Number(service.price) : null,
        category: service.category,
        color: service.color,
      })),
      staff: await Promise.all(
        staff.map(async (member) => ({
          id: member.id,
          name: member.name,
          bio: member.bio,
          avatarUrl: await this.filesService.resolveStoredReference(member.avatarUrl, tenantId),
          serviceIds: member.staffServices?.map((link) => link.serviceId) ?? [],
        })),
      ),
    };

    response.page.seo.ogImageUrl = resolvedOgImageUrl ?? response.page.seo.ogImageUrl ?? null;

    return response;
  }

  async getRobotsTxt(host: string) {
    const resolved = await this.tenantsService.resolveTenantByHost(host);
    this.ensureActivePublicSubscription({
      subscriptionStartsAt: resolved.tenant.subscriptionStartsAt,
      subscriptionEndsAt: resolved.tenant.subscriptionEndsAt,
      timeZone: resolved.setting?.timezone,
    });
    const shouldIndex = resolved.setting?.siteIndexingEnabled ?? true;
    const canonicalHost = resolved.setting?.canonicalDomain ?? resolved.domain.domain;
    const lines = ['User-agent: *'];
    if (shouldIndex) {
      lines.push('Allow: /', `Sitemap: https://${canonicalHost}/sitemap.xml`);
    } else {
      lines.push('Disallow: /');
    }
    return lines.join('\n');
  }

  async getSitemapXml(host: string) {
    const resolved = await this.tenantsService.resolveTenantByHost(host);
    this.ensureActivePublicSubscription({
      subscriptionStartsAt: resolved.tenant.subscriptionStartsAt,
      subscriptionEndsAt: resolved.tenant.subscriptionEndsAt,
      timeZone: resolved.setting?.timezone,
    });
    const canonicalHost = resolved.setting?.canonicalDomain ?? resolved.domain.domain;
    const pages = await this.pagesRepository.find({
      where: { tenantId: resolved.tenant.id, isPublished: true, isIndexable: true },
      order: { isHome: 'DESC', slug: 'ASC' },
    });

    const urls = pages
      .map((page) => {
        const path = page.isHome ? '' : `/${page.slug}`;
        return `<url><loc>https://${canonicalHost}${path}</loc></url>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  }

  listTemplates() {
    return this.templatesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async listPages(tenantId: string) {
    const pages = await this.pagesRepository.find({
      where: { tenantId },
      relations: ['template'],
      order: { isHome: 'DESC', slug: 'ASC' },
    });

    return Promise.all(
      pages.map(async (page) => ({
        ...page,
        ogImageUrl: await this.filesService.resolveStoredReference(page.ogImageUrl, tenantId),
      })),
    );
  }

  async createPage(input: CreatePageDto) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const planDefinition = getPlanAccessDefinition(normalizePlanCode(tenant.plan));
    const maxPages = planDefinition.limits.max_pages;

    if (typeof maxPages === 'number') {
      const existingPages = await this.pagesRepository.count({ where: { tenantId: input.tenantId } });
      if (existingPages >= maxPages) {
        throw new BadRequestException('El plan actual no permite crear más páginas');
      }
    }

    return this.pagesRepository.save({
      tenantId: input.tenantId,
      templateId: await this.getActiveTemplateId(input.templateId),
      slug: input.slug,
      title: input.title,
      isHome: input.isHome ?? false,
      isPublished: input.isPublished ?? false,
      isIndexable: input.isIndexable ?? true,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      canonicalUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogImageUrl: input.ogImageUrl ?? null,
      metaRobots: null,
    });
  }

  async updatePage(pageId: string, tenantId: string, input: UpdatePageDto) {
    const page = await this.pagesRepository.findOne({ where: { id: pageId, tenantId } });
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    Object.assign(page, {
      templateId: input.templateId ?? page.templateId,
      slug: input.slug ?? page.slug,
      title: input.title ?? page.title,
      isHome: input.isHome ?? page.isHome,
      isPublished: input.isPublished ?? page.isPublished,
      isIndexable: input.isIndexable ?? page.isIndexable,
      seoTitle: input.seoTitle ?? page.seoTitle,
      seoDescription: input.seoDescription ?? page.seoDescription,
      ogImageUrl: input.ogImageUrl ?? page.ogImageUrl,
    });

    return this.pagesRepository.save(page);
  }

  async removePage(pageId: string, tenantId: string) {
    const page = await this.pagesRepository.findOne({ where: { id: pageId, tenantId } });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    await this.pagesRepository.remove(page);
    return { success: true };
  }

  async listSections(tenantId: string, pageId?: string, scope?: SiteSectionScope) {
    const normalizedScope = this.normalizeSectionScope(scope);

    if (normalizedScope === 'global') {
      const sections = await this.sectionsRepository.find({
        where: { tenantId, scope: 'global' },
        order: { position: 'ASC' },
      });
      return Promise.all(
        sections.map(async (section) => {
          const content = { ...(section.content ?? {}) } as Record<string, unknown>;
          if (section.type === 'custom_html' && Array.isArray(content.assets)) {
            content.assets = (content.assets as Array<Record<string, unknown>>).map((asset) => {
              if (!asset || typeof asset !== 'object') {
                return asset;
              }
              const rawUrl = String(asset.url ?? '').trim();
              const match = rawUrl.match(/^file:([0-9a-f-]+)$/i);
              if (asset.fileId || !match) {
                return asset;
              }
              return {
                ...asset,
                fileId: match[1],
              };
            });
          }

          return {
            ...section,
            content: await this.filesService.resolveContentAssets(content, tenantId),
          };
        }),
      );
    }

    if (!pageId) {
      throw new BadRequestException('Page id is required');
    }

    const page = await this.pagesRepository.findOne({ where: { id: pageId, tenantId } });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    const sections = await this.sectionsRepository.find({
      where: { tenantId, pageId, scope: 'page' },
      order: { position: 'ASC' },
    });
    return Promise.all(
      sections.map(async (section) => {
        const content = { ...(section.content ?? {}) } as Record<string, unknown>;
        if (section.type === 'custom_html' && Array.isArray(content.assets)) {
          content.assets = (content.assets as Array<Record<string, unknown>>).map((asset) => {
            if (!asset || typeof asset !== 'object') {
              return asset;
            }
            const rawUrl = String(asset.url ?? '').trim();
            const match = rawUrl.match(/^file:([0-9a-f-]+)$/i);
            if (asset.fileId || !match) {
              return asset;
            }
            return {
              ...asset,
              fileId: match[1],
            };
          });
        }

        return {
          ...section,
          content: await this.filesService.resolveContentAssets(content, tenantId),
        };
      }),
    );
  }

  async createSection(input: CreateSectionDto) {
    const sectionType = this.normalizeSectionType(input.type);
    const scope = this.normalizeSectionScope(input.scope);
    this.validateSectionScope(sectionType, scope);
    let pageId: string | null = null;

    if (scope === 'page') {
      if (!input.pageId) {
        throw new BadRequestException('Page id is required');
      }

      const page = await this.pagesRepository.findOne({
        where: { id: input.pageId, tenantId: input.tenantId },
      });
      if (!page) {
        throw new NotFoundException('Page not found');
      }
      pageId = page.id;
    }

    return this.sectionsRepository.save({
      tenantId: input.tenantId,
      pageId,
      scope,
      type: sectionType,
      variant: input.variant,
      position: input.position,
      isVisible: input.isVisible ?? true,
      settings: input.settings ?? {},
      content: this.sanitizeSectionContent(sectionType, input.content),
    });
  }

  async updateSection(sectionId: string, tenantId: string, input: UpdateSectionDto) {
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId, tenantId },
    });
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const nextType = input.type ? this.normalizeSectionType(input.type) : (section.type as SiteSectionType);
    const nextScope = input.scope ? this.normalizeSectionScope(input.scope) : section.scope;
    this.validateSectionScope(nextType, nextScope);
    let nextPageId = input.pageId ?? section.pageId;

    if (nextScope === 'page') {
      if (!nextPageId) {
        throw new BadRequestException('Page id is required');
      }
      const page = await this.pagesRepository.findOne({ where: { id: nextPageId, tenantId } });
      if (!page) {
        throw new NotFoundException('Page not found');
      }
    } else {
      nextPageId = null;
    }

    Object.assign(section, {
      type: nextType,
      scope: nextScope,
      pageId: nextPageId,
      variant: input.variant ?? section.variant,
      position: input.position ?? section.position,
      isVisible: input.isVisible ?? section.isVisible,
      settings: input.settings ?? section.settings,
      content: input.content ? this.sanitizeSectionContent(nextType, input.content) : section.content,
    });

    return this.sectionsRepository.save(section);
  }

  async removeSection(sectionId: string, tenantId: string) {
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId, tenantId },
    });
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    await this.sectionsRepository.remove(section);
    return { success: true };
  }
}
