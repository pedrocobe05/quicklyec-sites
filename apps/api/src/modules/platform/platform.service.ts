import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  AdminUserEntity,
  PlatformRoleEntity,
  PlatformSettingEntity,
  SitePageEntity,
  SiteTemplateEntity,
  SiteSectionEntity,
  SubscriptionPlanEntity,
  TenantBrandingEntity,
  TenantDomainEntity,
  TenantEntity,
  TenantMembershipEntity,
  TenantRoleEntity,
  TenantSettingEntity,
} from 'src/common/entities';
import { CreatePlatformMembershipDto } from './dto/create-platform-membership.dto';
import { CreatePlatformRoleDto } from './dto/create-platform-role.dto';
import { CreatePlatformTenantDto } from './dto/create-platform-tenant.dto';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { UpdatePlatformTenantDto } from './dto/update-platform-tenant.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';
import { UpdatePlatformRoleDto } from './dto/update-platform-role.dto';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { MailService } from '../mail/mail.service';
import {
  DEFAULT_TENANT_ROLE_DEFINITIONS,
  getPlanAccessDefinition,
  getPlanMetadata,
  normalizePlanCode,
} from '../tenants/tenant-access.constants';

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly plansRepository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(PlatformRoleEntity)
    private readonly platformRolesRepository: Repository<PlatformRoleEntity>,
    @InjectRepository(PlatformSettingEntity)
    private readonly platformSettingsRepository: Repository<PlatformSettingEntity>,
    @InjectRepository(SitePageEntity)
    private readonly pagesRepository: Repository<SitePageEntity>,
    @InjectRepository(SiteTemplateEntity)
    private readonly templatesRepository: Repository<SiteTemplateEntity>,
    @InjectRepository(SiteSectionEntity)
    private readonly sectionsRepository: Repository<SiteSectionEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
    @InjectRepository(TenantDomainEntity)
    private readonly domainsRepository: Repository<TenantDomainEntity>,
    @InjectRepository(TenantSettingEntity)
    private readonly settingsRepository: Repository<TenantSettingEntity>,
    @InjectRepository(TenantBrandingEntity)
    private readonly brandingRepository: Repository<TenantBrandingEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipsRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(TenantRoleEntity)
    private readonly rolesRepository: Repository<TenantRoleEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly usersRepository: Repository<AdminUserEntity>,
    private readonly mailService: MailService,
  ) {}

  private normalizeHost(host: string) {
    return host.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }

  private createTemporaryPassword() {
    return `Quickly${Math.random().toString(36).slice(2, 10)}!`;
  }

  private async syncTenantPlanCapabilities(tenantId: string, planCode: string) {
    const normalizedPlan = normalizePlanCode(planCode);
    const planDefinition = getPlanAccessDefinition(normalizedPlan);
    const planMetadata = getPlanMetadata(normalizedPlan);
    const bookingEnabled = planMetadata.features.includes('online_booking');

    let settings = await this.settingsRepository.findOne({ where: { tenantId } });
    if (!settings) {
      settings = this.settingsRepository.create({
        tenantId,
        publicSiteEnabled: true,
      });
    }

    settings.bookingEnabled = bookingEnabled;
    await this.settingsRepository.save(settings);

    const activeTemplate = await this.templatesRepository.findOne({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    if (!activeTemplate) {
      throw new BadRequestException('No active site template available');
    }

    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const corePages = [
      { slug: 'home', title: tenant.name, isHome: true },
      { slug: 'servicios', title: 'Servicios', isHome: false },
      { slug: 'contacto', title: 'Contacto', isHome: false },
    ];

    for (const pageDefinition of corePages) {
      const existingPage = await this.pagesRepository.findOne({
        where: { tenantId, slug: pageDefinition.slug },
      });

      if (!existingPage) {
        await this.pagesRepository.save({
          tenantId,
          templateId: activeTemplate.id,
          slug: pageDefinition.slug,
          title: pageDefinition.title,
          isHome: pageDefinition.isHome,
          isPublished: true,
          isIndexable: true,
          seoTitle: pageDefinition.title === tenant.name ? pageDefinition.title : `${pageDefinition.title} | ${tenant.name}`,
          seoDescription: pageDefinition.title === 'Servicios'
            ? `Servicios disponibles en ${tenant.name}.`
            : pageDefinition.title === 'Contacto'
              ? `Información de contacto de ${tenant.name}.`
              : null,
          canonicalUrl: null,
          ogTitle: null,
          ogDescription: null,
          ogImageUrl: null,
          metaRobots: null,
        });
      }
    }

    const pages = await this.pagesRepository.find({
      where: { tenantId },
      order: { isHome: 'DESC', slug: 'ASC' },
    });

    const existingGlobalHeader = await this.sectionsRepository.findOne({
      where: { tenantId, scope: 'global', type: 'header' },
    });
    if (!existingGlobalHeader) {
      await this.sectionsRepository.save({
        tenantId,
        pageId: null,
        scope: 'global',
        type: 'header',
        variant: 'default',
        position: 1,
        isVisible: true,
        settings: {},
        content: {
          title: tenant.name,
          subtitle: bookingEnabled ? 'Sitio y reservas online' : 'Sitio informativo del negocio',
        },
      });
    }

    const existingGlobalFooter = await this.sectionsRepository.findOne({
      where: { tenantId, scope: 'global', type: 'footer' },
    });
    if (!existingGlobalFooter) {
      await this.sectionsRepository.save({
        tenantId,
        pageId: null,
        scope: 'global',
        type: 'footer',
        variant: 'default',
        position: 2,
        isVisible: true,
        settings: {},
        content: {
          text: `${tenant.name} · Powered by Quickly Sites`,
        },
      });
    }

    const maxPages = planDefinition.limits.max_pages;
    if (typeof maxPages === 'number' && pages.length > maxPages) {
      const allowedPageIds = new Set(pages.slice(0, maxPages).map((page) => page.id));
      for (const page of pages) {
        if (!allowedPageIds.has(page.id) && page.isPublished) {
          page.isPublished = false;
          await this.pagesRepository.save(page);
        }
      }
    }

    const pageIds = pages.map((page) => page.id);
    if (pageIds.length === 0) {
      return;
    }

    const bookingSections = await this.sectionsRepository.find({
      where: pageIds.map((pageId) => ({ pageId, type: 'booking_cta' })),
    });

    for (const section of bookingSections) {
      if (section.isVisible !== bookingEnabled) {
        section.isVisible = bookingEnabled;
        await this.sectionsRepository.save(section);
      }
    }
  }

  listPlans() {
    return this.plansRepository.find({
      order: { name: 'ASC' },
    });
  }

  listUsers() {
    return this.usersRepository.find({
      where: { isPlatformAdmin: true },
      order: { createdAt: 'DESC' },
    });
  }

  listRoles() {
    return this.platformRolesRepository.find({
      order: { isSystem: 'DESC', name: 'ASC' },
    });
  }

  async createRole(input: CreatePlatformRoleDto) {
    const code = input.code.toLowerCase().trim();
    const existing = await this.platformRolesRepository.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException('Platform role code already exists');
    }

    return this.platformRolesRepository.save({
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isSystem: false,
      isActive: input.isActive ?? true,
      permissions: input.permissions ?? [],
    });
  }

  async updateRole(roleId: string, input: UpdatePlatformRoleDto) {
    const role = await this.platformRolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Platform role not found');
    }

    if (input.code && !role.isSystem) {
      const code = input.code.toLowerCase().trim();
      const existing = await this.platformRolesRepository.findOne({ where: { code } });
      if (existing && existing.id !== role.id) {
        throw new BadRequestException('Platform role code already exists');
      }
      role.code = code;
    }

    if (input.name !== undefined) {
      role.name = input.name.trim();
    }
    if (input.description !== undefined) {
      role.description = input.description?.trim() || null;
    }
    if (input.permissions !== undefined) {
      role.permissions = input.permissions;
    }
    if (input.isActive !== undefined) {
      role.isActive = input.isActive;
    }

    return this.platformRolesRepository.save(role);
  }

  async removeRole(roleId: string) {
    const role = await this.platformRolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Platform role not found');
    }
    role.isActive = false;
    return this.platformRolesRepository.save(role);
  }

  async getSettings() {
    return this.ensureSettings();
  }

  async updateSettings(input: UpdatePlatformSettingsDto) {
    const settings = await this.ensureSettings();
    Object.assign(settings, {
      platformName: input.platformName ?? settings.platformName,
      supportEmail: input.supportEmail ?? settings.supportEmail,
      supportPhone: input.supportPhone ?? settings.supportPhone,
      publicAppUrl: input.publicAppUrl ?? settings.publicAppUrl,
      quicklysitesBaseDomain: input.quicklysitesBaseDomain ?? settings.quicklysitesBaseDomain,
      defaultSenderName: input.defaultSenderName ?? settings.defaultSenderName,
      defaultSenderEmail: input.defaultSenderEmail ?? settings.defaultSenderEmail,
      metadata: input.metadata ?? settings.metadata,
    });
    return this.platformSettingsRepository.save(settings);
  }

  async createUser(input: CreatePlatformUserDto) {
    const email = input.email.toLowerCase().trim();
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Platform user email already exists');
    }

    const role = await this.platformRolesRepository.findOne({
      where: { code: input.platformRole ?? 'super_admin', isActive: true },
    });
    if (!role) {
      throw new BadRequestException('Platform role not found');
    }

    return this.usersRepository.save({
      fullName: input.fullName,
      email,
      passwordHash: await bcrypt.hash(input.password, 10),
      isActive: input.isActive ?? true,
      isPlatformAdmin: true,
      platformRole: role.code,
    });
  }

  async updateUser(userId: string, input: UpdatePlatformUserDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId, isPlatformAdmin: true } });
    if (!user) {
      throw new NotFoundException('Platform user not found');
    }

    if (input.email) {
      const normalizedEmail = input.email.toLowerCase().trim();
      const existingUser = await this.usersRepository.findOne({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Platform user email already exists');
      }
      user.email = normalizedEmail;
    }

    if (input.fullName !== undefined) {
      user.fullName = input.fullName;
    }

    if (input.password) {
      user.passwordHash = await bcrypt.hash(input.password, 10);
    }

    if (input.platformRole !== undefined) {
      const role = await this.platformRolesRepository.findOne({
        where: { code: input.platformRole, isActive: true },
      });
      if (!role) {
        throw new BadRequestException('Platform role not found');
      }
      user.platformRole = role.code;
    }

    if (input.isActive !== undefined) {
      user.isActive = input.isActive;
    }

    return this.usersRepository.save(user);
  }

  async removeUser(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId, isPlatformAdmin: true } });
    if (!user) {
      throw new NotFoundException('Platform user not found');
    }

    user.isActive = false;
    return this.usersRepository.save(user);
  }

  createPlan(input: CreateSubscriptionPlanDto) {
    const normalizedCode = normalizePlanCode(input.code);
    const fallbackPlan = getPlanAccessDefinition(normalizedCode);
    return this.plansRepository.save({
      code: normalizedCode,
      name: input.name,
      description: input.description ?? null,
      isActive: true,
      tenantModules: input.tenantModules?.length ? input.tenantModules : fallbackPlan.modules,
      platformModules: input.platformModules ?? [],
      metadata: input.metadata ?? getPlanMetadata(normalizedCode),
    });
  }

  async updatePlan(planId: string, input: UpdateSubscriptionPlanDto) {
    const plan = await this.plansRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    Object.assign(plan, {
      code: input.code ? normalizePlanCode(input.code) : plan.code,
      name: input.name ?? plan.name,
      description: input.description ?? plan.description,
      tenantModules: input.tenantModules ?? plan.tenantModules,
      platformModules: input.platformModules ?? plan.platformModules,
      metadata: input.metadata ?? plan.metadata,
    });

    return this.plansRepository.save(plan);
  }

  listTenants() {
    return this.tenantsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async createTenant(input: CreatePlatformTenantDto) {
    const slug = input.slug.toLowerCase().trim();
    const existingTenant = await this.tenantsRepository.findOne({ where: { slug } });
    if (existingTenant) {
      throw new BadRequestException('Tenant slug already exists');
    }

    const planCode = normalizePlanCode(input.plan ?? 'basic');
    const plan = await this.plansRepository.findOne({ where: { code: planCode, isActive: true } });
    if (!plan) {
      throw new BadRequestException('Subscription plan not found');
    }

    const primaryDomain = this.normalizeHost(input.primaryDomain ?? `${slug}.quicklysites.local`);
    const customDomain = input.customDomain ? this.normalizeHost(input.customDomain) : null;

    const existingPrimaryDomain = await this.domainsRepository.findOne({ where: { domain: primaryDomain } });
    if (existingPrimaryDomain) {
      throw new BadRequestException('Primary domain already exists');
    }

    if (customDomain) {
      const existingCustomDomain = await this.domainsRepository.findOne({ where: { domain: customDomain } });
      if (existingCustomDomain) {
        throw new BadRequestException('Custom domain already exists');
      }
    }

    const tenant = await this.tenantsRepository.save({
      name: input.name,
      slug,
      status: input.status ?? 'active',
      plan: plan.code,
    });
    const planMetadata = getPlanMetadata(plan.code);
    const bookingEnabled = planMetadata.features.includes('online_booking');

    await this.rolesRepository.save({
      tenantId: tenant.id,
      code: DEFAULT_TENANT_ROLE_DEFINITIONS[0].code,
      name: DEFAULT_TENANT_ROLE_DEFINITIONS[0].name,
      description: DEFAULT_TENANT_ROLE_DEFINITIONS[0].description,
      isSystem: true,
      isActive: true,
      permissions: [...DEFAULT_TENANT_ROLE_DEFINITIONS[0].permissions],
    });

    await this.domainsRepository.save({
      tenantId: tenant.id,
      domain: primaryDomain,
      type: 'subdomain',
      isPrimary: true,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      sslStatus: 'active',
    });

    if (customDomain) {
      await this.domainsRepository.save({
        tenantId: tenant.id,
        domain: customDomain,
        type: 'custom',
        isPrimary: false,
        verificationStatus: 'pending',
        verifiedAt: null,
        sslStatus: 'pending',
      });
    }

    await this.settingsRepository.save({
      tenantId: tenant.id,
      publicSiteEnabled: true,
      bookingEnabled,
      timezone: input.timezone ?? 'America/Guayaquil',
      locale: input.locale ?? 'es-EC',
      currency: input.currency ?? 'USD',
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      siteIndexingEnabled: true,
      defaultSeoTitle: input.name,
      defaultSeoDescription: bookingEnabled
        ? `${input.name} | Sitio web y reservas online`
        : `${input.name} | Sitio web del negocio`,
      defaultOgImageUrl: null,
      canonicalDomain: primaryDomain,
    });

    await this.brandingRepository.save({
      tenantId: tenant.id,
      logoUrl: null,
      faviconUrl: null,
      primaryColor: '#1F2937',
      secondaryColor: '#F3F4F6',
      accentColor: '#111827',
      fontFamily: 'Playfair Display',
      borderRadius: '1.5rem',
      buttonStyle: 'pill',
      customCss: null,
    });

    await this.syncTenantPlanCapabilities(tenant.id, tenant.plan);

    return {
      tenant,
      primaryDomain,
      customDomain,
    };
  }

  async updateTenant(tenantId: string, input: UpdatePlatformTenantDto) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (input.slug && input.slug !== tenant.slug) {
      const existingTenant = await this.tenantsRepository.findOne({ where: { slug: input.slug } });
      if (existingTenant && existingTenant.id !== tenantId) {
        throw new BadRequestException('Tenant slug already exists');
      }
      tenant.slug = input.slug.toLowerCase().trim();
    }

    if (input.name !== undefined) {
      tenant.name = input.name;
    }

    if (input.status !== undefined) {
      tenant.status = input.status;
    }

    if (input.plan !== undefined) {
      tenant.plan = normalizePlanCode(input.plan);
    }

    const savedTenant = await this.tenantsRepository.save(tenant);
    if (input.plan !== undefined) {
      await this.syncTenantPlanCapabilities(savedTenant.id, savedTenant.plan);
    }
    return savedTenant;
  }

  async updateTenantPlan(tenantId: string, plan: string) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    tenant.plan = normalizePlanCode(plan);
    const savedTenant = await this.tenantsRepository.save(tenant);
    await this.syncTenantPlanCapabilities(savedTenant.id, savedTenant.plan);
    return savedTenant;
  }

  async removeTenant(tenantId: string) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    tenant.status = 'archived';
    return this.tenantsRepository.save(tenant);
  }

  async createMembership(input: CreatePlatformMembershipDto) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let user = await this.usersRepository.findOne({
      where: { email: input.email.toLowerCase().trim() },
    });

    let generatedPassword: string | null = null;

    if (!user) {
      generatedPassword = input.password?.trim() || this.createTemporaryPassword();
      user = await this.usersRepository.save({
        fullName: input.fullName,
        email: input.email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(generatedPassword, 10),
        isActive: true,
        isPlatformAdmin: false,
        platformRole: 'tenant_admin',
      });
    } else if (input.fullName && user.fullName !== input.fullName) {
      user.fullName = input.fullName;
      await this.usersRepository.save(user);
    }

    const existingMembership = await this.membershipsRepository.findOne({
      where: { userId: user.id, tenantId: tenant.id },
    });

    if (existingMembership) {
      throw new BadRequestException('Membership already exists for this user and tenant');
    }

    const defaultRole = input.roleId
      ? await this.rolesRepository.findOne({
          where: { tenantId: tenant.id, id: input.roleId, isActive: true },
        })
      : null;

    const resolvedRole =
      defaultRole ??
      (await this.rolesRepository.findOne({
        where: {
          tenantId: tenant.id,
          code: DEFAULT_TENANT_ROLE_DEFINITIONS[0].code,
          isActive: true,
        },
      }));

    if (!resolvedRole) {
      throw new BadRequestException('Default tenant role not found');
    }

    const membership = await this.membershipsRepository.save({
      userId: user.id,
      tenantId: tenant.id,
      roleId: resolvedRole.id,
      role: resolvedRole.code,
      isActive: input.isActive ?? true,
      allowedModules: null,
      permissions: null,
    });

    if (generatedPassword) {
      await this.mailService.sendWelcomeEmail({
        to: user.email,
        tenantId: tenant.id,
        recipientName: user.fullName,
        tenantName: tenant.name,
        temporaryPassword: generatedPassword,
      });
    }

    return {
      membership,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
      generatedPassword,
    };
  }

  private async ensureSettings() {
    let settings = await this.platformSettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!settings) {
      settings = await this.platformSettingsRepository.save({
        platformName: 'Quickly Sites',
        supportEmail: 'sites@quicklyec.com',
        supportPhone: null,
        publicAppUrl: null,
        quicklysitesBaseDomain: 'quicklysites.local',
        defaultSenderName: 'Quickly Sites',
        defaultSenderEmail: 'sites@quicklyec.com',
        metadata: null,
      });
    }

    return settings;
  }
}
