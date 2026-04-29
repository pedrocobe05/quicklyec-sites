import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, QueryFailedError, Repository } from 'typeorm';
import {
  AdminUserEntity,
  SitePageEntity,
  StaffEntity,
  TenantBrandingEntity,
  TenantDomainEntity,
  TenantEntity,
  TenantSettingEntity,
  TenantMembershipEntity,
  TenantRoleEntity,
  SubscriptionPlanEntity,
  WhatsappOutboundLogEntity,
} from 'src/common/entities';
import * as bcrypt from 'bcrypt';
import { CreateTenantMembershipDto } from './dto/create-tenant-membership.dto';
import { CreateTenantRoleDto } from './dto/create-tenant-role.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { CreateTenantDomainDto } from './dto/create-tenant-domain.dto';
import { UpdateTenantDomainDto } from './dto/update-tenant-domain.dto';
import { UpdateTenantMembershipDto } from './dto/update-tenant-membership.dto';
import { UpdateTenantRoleDto } from './dto/update-tenant-role.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { MailService } from '../mail/mail.service';
import { FilesService } from '../files/files.service';
import {
  ADMINISTRATOR_ROLE_CODE,
  DEFAULT_TENANT_ROLE_DEFINITIONS,
  IMMUTABLE_SYSTEM_TENANT_ROLE_CODES,
  STAFF_ROLE_CODE,
  getPlanAccessDefinition,
  getPlanMetadata,
  intersectTenantModules,
  mergeStoredPlanModulesWithCanonical,
  normalizePlanCode,
  resolveTenantMembershipAccess,
} from './tenant-access.constants';
import { getTenantSubscriptionState } from './subscription.utils';
import { APPOINTMENT_REMINDER_CHANNEL } from 'src/modules/whatsapp/whatsapp-appointment-reminder.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
    @InjectRepository(TenantDomainEntity)
    private readonly domainsRepository: Repository<TenantDomainEntity>,
    @InjectRepository(TenantSettingEntity)
    private readonly settingsRepository: Repository<TenantSettingEntity>,
    @InjectRepository(SitePageEntity)
    private readonly pagesRepository: Repository<SitePageEntity>,
    @InjectRepository(TenantBrandingEntity)
    private readonly brandingRepository: Repository<TenantBrandingEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipsRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly usersRepository: Repository<AdminUserEntity>,
    @InjectRepository(TenantRoleEntity)
    private readonly rolesRepository: Repository<TenantRoleEntity>,
    @InjectRepository(SubscriptionPlanEntity)
    private readonly plansRepository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepository: Repository<StaffEntity>,
    @InjectRepository(WhatsappOutboundLogEntity)
    private readonly whatsappOutboundLogsRepository: Repository<WhatsappOutboundLogEntity>,
    private readonly mailService: MailService,
    private readonly filesService: FilesService,
  ) {}

  private startOfMonthUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  }

  private async assertLinkedStaffIdForTenant(
    tenantId: string,
    linkedStaffId: string | null | undefined,
    options?: { exceptMembershipId?: string },
  ): Promise<string> {
    const trimmed = typeof linkedStaffId === 'string' ? linkedStaffId.trim() : '';
    if (!trimmed) {
      throw new BadRequestException('El rol Staff requiere vincular un profesional de la empresa.');
    }
    const staff = await this.staffRepository.findOne({ where: { id: trimmed, tenantId } });
    if (!staff) {
      throw new BadRequestException('Profesional no encontrado en esta empresa.');
    }
    const existing = await this.membershipsRepository.findOne({
      where: { tenantId, linkedStaffId: staff.id },
    });
    if (existing && existing.id !== options?.exceptMembershipId) {
      throw new BadRequestException('Ese profesional ya tiene un usuario del panel vinculado en esta empresa.');
    }
    return staff.id;
  }

  /** Índice único (tenantId, linkedStaffId): carrera entre peticiones o bypass de validación. */
  private rethrowIfMembershipLinkedStaffUniqueConflict(err: unknown): never {
    if (err instanceof QueryFailedError) {
      const d = err.driverError as { code?: string; detail?: string; constraint?: string } | undefined;
      if (d?.code === '23505') {
        const hint = `${d.detail ?? ''} ${d.constraint ?? ''} ${err.message}`;
        if (hint.includes('linkedStaff') || hint.includes('linked_staff')) {
          throw new BadRequestException('Ese profesional ya tiene un usuario del panel vinculado en esta empresa.');
        }
      }
    }
    throw err;
  }

  normalizeHost(host: string) {
    return host.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }

  private arraysAreEqual(left: string[] | null | undefined, right: readonly string[]) {
    const normalizedLeft = left ?? [];
    if (normalizedLeft.length !== right.length) {
      return false;
    }

    return normalizedLeft.every((value, index) => value === right[index]);
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

  private normalizeHexColor(value: string | null | undefined, fallback: string) {
    const normalized = String(value ?? '').trim();
    const hexColorPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    if (hexColorPattern.test(normalized)) {
      return normalized;
    }
    return fallback;
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

  async resolveTenantByHost(host: string) {
    const normalizedHost = this.normalizeHost(host);

    const domain = await this.domainsRepository.findOne({
      where: { domain: normalizedHost },
      relations: ['tenant'],
    });

    if (!domain) {
      throw new NotFoundException(`Tenant domain not found for host ${normalizedHost}`);
    }

    const setting = await this.settingsRepository.findOne({
      where: { tenantId: domain.tenantId },
    });
    const branding = await this.brandingRepository.findOne({
      where: { tenantId: domain.tenantId },
    });

    return {
      tenant: domain.tenant,
      domain,
      setting,
      branding,
    };
  }

  async getTenantProfile(tenantId: string, userId?: string) {
    await this.ensureSystemRoles(tenantId);

    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const [settings, branding, domains, planDefinition, membership, settingsViewer] = await Promise.all([
      this.settingsRepository.findOne({ where: { tenantId } }),
      this.brandingRepository.findOne({ where: { tenantId } }),
      this.domainsRepository.find({ where: { tenantId }, order: { isPrimary: 'DESC', domain: 'ASC' } }),
      this.plansRepository.findOne({ where: { code: normalizePlanCode(tenant.plan), isActive: true } }),
      userId
        ? this.membershipsRepository.findOne({
            where: { tenantId, userId, isActive: true },
            relations: ['roleDefinition'],
          })
        : Promise.resolve(null),
      userId
        ? this.usersRepository.findOne({ where: { id: userId }, select: ['id', 'isPlatformAdmin'] })
        : Promise.resolve(null),
    ]);
    const viewerIsPlatformAdmin = Boolean(settingsViewer?.isPlatformAdmin);

    const normalizedPlanCode = normalizePlanCode(tenant.plan);
    const fallbackPlanDefinition = getPlanAccessDefinition(normalizedPlanCode);
    const planModules = mergeStoredPlanModulesWithCanonical(
      planDefinition?.tenantModules?.length ? planDefinition.tenantModules : undefined,
      normalizedPlanCode,
    );
    const rolePermissions = membership?.roleDefinition?.permissions ?? membership?.permissions ?? [];
    const effectiveModules = membership ? intersectTenantModules(planModules, rolePermissions) : planModules;
    const [resolvedLogoUrl, resolvedFaviconUrl] = await Promise.all([
      this.filesService.resolveStoredReference(branding?.logoUrl, tenantId),
      this.filesService.resolveStoredReference(branding?.faviconUrl, tenantId),
    ]);

    const settingsPayload =
      settings && !viewerIsPlatformAdmin ? { ...settings, mailConfig: null } : settings;

    const sentWhatsappRemindersThisMonth = settings
      ? await this.whatsappOutboundLogsRepository.count({
          where: {
            tenantId,
            channel: APPOINTMENT_REMINDER_CHANNEL,
            status: 'sent',
            createdAt: MoreThanOrEqual(this.startOfMonthUtc()),
          },
        })
      : 0;

    const whatsappReminderUsage = {
      sentThisMonth: sentWhatsappRemindersThisMonth,
      monthlyQuota: settings?.whatsappReminderMonthlyQuota ?? 100,
    };

    return {
      tenant: {
        ...tenant,
        plan: normalizedPlanCode,
      },
      settings: settingsPayload,
      branding: branding
        ? {
            ...branding,
            logoUrl: resolvedLogoUrl,
            faviconUrl: resolvedFaviconUrl,
          }
        : null,
      domains,
      planDefinition: planDefinition
        ? {
            ...planDefinition,
            code: normalizedPlanCode,
            tenantModules: planModules,
            metadata: planDefinition.metadata ?? getPlanMetadata(normalizedPlanCode),
          }
        : {
            code: fallbackPlanDefinition.code,
            name: fallbackPlanDefinition.name,
            description: fallbackPlanDefinition.description,
            tenantModules: fallbackPlanDefinition.modules,
            metadata: getPlanMetadata(normalizedPlanCode),
          },
      planCapabilities: {
        modules: planModules,
        ...getPlanMetadata(normalizedPlanCode),
      },
      membership: membership
        ? {
            id: membership.id,
            roleId: membership.roleId,
            linkedStaffId: membership.linkedStaffId,
            role: membership.roleDefinition
              ? {
                  id: membership.roleDefinition.id,
                  code: membership.roleDefinition.code,
                  name: membership.roleDefinition.name,
                  permissions: membership.roleDefinition.permissions,
                }
              : null,
            permissions: rolePermissions,
          }
        : null,
      effectiveModules,
      effectivePermissions: rolePermissions.filter((permission) =>
        effectiveModules.includes(permission.split('.')[0]),
      ),
      subscription: getTenantSubscriptionState({
        subscriptionStartsAt: tenant.subscriptionStartsAt,
        subscriptionEndsAt: tenant.subscriptionEndsAt,
        timeZone: settings?.timezone,
      }),
      whatsappReminderUsage,
    };
  }

  async updateTenantBranding(tenantId: string, input: UpdateTenantBrandingDto) {
    let branding = await this.brandingRepository.findOne({ where: { tenantId } });
    if (!branding) {
      branding = this.brandingRepository.create({ tenantId });
    }

    const nextInput = { ...input };
    if (typeof nextInput.customCss === 'string') {
      nextInput.customCss = this.sanitizeCustomCss(nextInput.customCss);
    }
    if (typeof nextInput.primaryColor === 'string') {
      nextInput.primaryColor = this.normalizeHexColor(nextInput.primaryColor, branding.primaryColor ?? '#D89AA5');
    }
    if (typeof nextInput.secondaryColor === 'string') {
      nextInput.secondaryColor = this.normalizeHexColor(nextInput.secondaryColor, branding.secondaryColor ?? '#F5E8EA');
    }
    if (typeof nextInput.accentColor === 'string') {
      nextInput.accentColor = this.normalizeHexColor(nextInput.accentColor, branding.accentColor ?? '#A86172');
    }

    Object.assign(branding, nextInput);
    return this.brandingRepository.save(branding);
  }

  async updateTenantSettings(tenantId: string, input: UpdateTenantSettingsDto) {
    let settings = await this.settingsRepository.findOne({ where: { tenantId } });
    if (!settings) {
      settings = this.settingsRepository.create({ tenantId });
    }

    const nextInput: Record<string, unknown> = { ...input };
    if (typeof nextInput.locale === 'string') {
      nextInput.locale = this.normalizeLocale(nextInput.locale);
    }
    if (typeof nextInput.defaultSeoTitle === 'string') {
      const normalized = nextInput.defaultSeoTitle.trim();
      nextInput.defaultSeoTitle = normalized || null;
    }
    if (typeof nextInput.defaultSeoDescription === 'string') {
      const normalized = nextInput.defaultSeoDescription.trim();
      nextInput.defaultSeoDescription = normalized || null;
    }
    if (typeof nextInput.defaultOgImageUrl === 'string') {
      const normalized = nextInput.defaultOgImageUrl.trim();
      nextInput.defaultOgImageUrl = normalized || null;
    }
    if (typeof nextInput.canonicalDomain === 'string') {
      const normalized = this.normalizeHost(nextInput.canonicalDomain);
      nextInput.canonicalDomain = normalized || null;
    }
    if (typeof nextInput.payphoneMode === 'string') {
      nextInput.payphoneMode = this.normalizePayphoneMode(nextInput.payphoneMode);
    }
    if (typeof nextInput.payphoneStoreId === 'string') {
      const normalized = nextInput.payphoneStoreId.trim();
      nextInput.payphoneStoreId = normalized || null;
    }
    if (typeof nextInput.payphoneToken === 'string') {
      const normalized = nextInput.payphoneToken.trim();
      nextInput.payphoneToken = normalized || null;
    }
    if (typeof nextInput.whatsappReminderMonthlyQuota === 'number') {
      nextInput.whatsappReminderMonthlyQuota = Math.min(
        1_000_000,
        Math.max(0, Math.floor(nextInput.whatsappReminderMonthlyQuota)),
      );
    }

    Object.assign(settings, nextInput);
    const savedSettings = await this.settingsRepository.save(settings);

    const homeSeoUpdate: Record<string, string | boolean | null> = {};
    if (Object.prototype.hasOwnProperty.call(nextInput, 'defaultSeoTitle')) {
      homeSeoUpdate.seoTitle = (nextInput.defaultSeoTitle as string | null) ?? null;
      homeSeoUpdate.ogTitle = (nextInput.defaultSeoTitle as string | null) ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(nextInput, 'defaultSeoDescription')) {
      homeSeoUpdate.seoDescription = (nextInput.defaultSeoDescription as string | null) ?? null;
      homeSeoUpdate.ogDescription = (nextInput.defaultSeoDescription as string | null) ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(nextInput, 'defaultOgImageUrl')) {
      homeSeoUpdate.ogImageUrl = (nextInput.defaultOgImageUrl as string | null) ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(nextInput, 'canonicalDomain')) {
      const canonicalDomain = (nextInput.canonicalDomain as string | null) ?? null;
      homeSeoUpdate.canonicalUrl = canonicalDomain ? `https://${canonicalDomain}/` : null;
    }
    if (Object.prototype.hasOwnProperty.call(nextInput, 'siteIndexingEnabled')) {
      const shouldIndex = Boolean(nextInput.siteIndexingEnabled);
      homeSeoUpdate.isIndexable = shouldIndex;
      homeSeoUpdate.metaRobots = shouldIndex ? 'index,follow' : 'noindex,nofollow';
    }

    if (Object.keys(homeSeoUpdate).length > 0) {
      await this.pagesRepository.update({ tenantId, isHome: true }, homeSeoUpdate);
    }

    return savedSettings;
  }

  async listWhatsappOutboundLogs(tenantId: string, limit: number) {
    const take = Math.min(Math.max(limit, 1), 200);
    return this.whatsappOutboundLogsRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take,
      select: [
        'id',
        'appointmentId',
        'channel',
        'toPhone',
        'templateName',
        'languageCode',
        'bodyParams',
        'renderedPreview',
        'graphMessageId',
        'status',
        'errorMessage',
        'createdAt',
      ],
    });
  }

  async sendTestEmail(tenantId: string, to: string) {
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mailService.sendTestEmail({
      tenantId,
      to,
    });
  }

  async createTenantDomain(input: CreateTenantDomainDto) {
    const normalizedDomain = this.normalizeHost(input.domain);
    const existingDomain = await this.domainsRepository.findOne({
      where: { domain: normalizedDomain },
    });

    if (existingDomain) {
      if (existingDomain.tenantId === input.tenantId) {
        throw new BadRequestException('Ese dominio ya está registrado en este tenant');
      }

      throw new BadRequestException('Ese dominio ya está registrado en otro tenant');
    }

    if (input.isPrimary) {
      await this.domainsRepository.update({ tenantId: input.tenantId, isPrimary: true }, { isPrimary: false });
    }

    return this.domainsRepository.save({
      tenantId: input.tenantId,
      domain: normalizedDomain,
      type: input.type,
      isPrimary: input.isPrimary ?? false,
      verificationStatus: input.verificationStatus ?? 'pending',
      verifiedAt: input.verificationStatus === 'verified' ? new Date() : null,
      sslStatus: 'pending',
    });
  }

  async updateTenantDomain(domainId: string, tenantId: string, input: UpdateTenantDomainDto) {
    const domain = await this.domainsRepository.findOne({ where: { id: domainId, tenantId } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    const nextDomain = input.domain ? this.normalizeHost(input.domain) : domain.domain;
    const duplicateDomain = await this.domainsRepository.findOne({
      where: { domain: nextDomain },
    });

    if (duplicateDomain && duplicateDomain.id !== domainId) {
      if (duplicateDomain.tenantId === tenantId) {
        throw new BadRequestException('Ese dominio ya está registrado en este tenant');
      }

      throw new BadRequestException('Ese dominio ya está registrado en otro tenant');
    }

    if (input.isPrimary) {
      await this.domainsRepository.update({ tenantId, isPrimary: true }, { isPrimary: false });
    }

    Object.assign(domain, {
      domain: nextDomain,
      type: input.type ?? domain.type,
      isPrimary: input.isPrimary ?? domain.isPrimary,
      verificationStatus: input.verificationStatus ?? domain.verificationStatus,
      verifiedAt:
        input.verificationStatus === 'verified'
          ? new Date()
          : input.verificationStatus
            ? null
            : domain.verifiedAt,
    });

    return this.domainsRepository.save(domain);
  }

  async removeTenantDomain(domainId: string, tenantId: string) {
    const domain = await this.domainsRepository.findOne({ where: { id: domainId, tenantId } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    await this.domainsRepository.remove(domain);
    return { success: true };
  }

  /**
   * Usuarios de consola no pueden pertenecer a dos empresas; los de plataforma no se asignan como miembros.
   */
  async assertUserCanJoinTenantAsMember(user: AdminUserEntity, tenantId: string) {
    if (user.isPlatformAdmin) {
      throw new BadRequestException('Los usuarios de plataforma no se agregan como miembros de empresa.');
    }
    if (user.tenantId && user.tenantId !== tenantId) {
      throw new BadRequestException('Este usuario ya está asignado a otra empresa.');
    }
    const otherMemberships = await this.membershipsRepository.find({ where: { userId: user.id } });
    if (otherMemberships.some((m) => m.tenantId !== tenantId)) {
      throw new BadRequestException('Este usuario ya pertenece a otra empresa.');
    }
  }

  /** Usuarios de consola del tenant (excluye cuentas de super admin de plataforma). */
  listMemberships(tenantId: string) {
    return this.ensureSystemRoles(tenantId).then(() =>
      this.membershipsRepository
        .createQueryBuilder('m')
        .innerJoinAndSelect('m.user', 'u')
        .leftJoinAndSelect('m.roleDefinition', 'rd')
        .where('m.tenantId = :tenantId', { tenantId })
        .andWhere('u.isPlatformAdmin = :isPlatformAdmin', { isPlatformAdmin: false })
        .orderBy('m.role', 'ASC')
        .getMany(),
    );
  }

  listRoles(tenantId: string) {
    return this.ensureSystemRoles(tenantId).then(() => this.rolesRepository.find({
      where: { tenantId },
      order: { isSystem: 'DESC', name: 'ASC' },
    }));
  }

  async createRole(tenantId: string, input: CreateTenantRoleDto) {
    const existing = await this.rolesRepository.findOne({
      where: { tenantId, code: input.code.toLowerCase().trim() },
    });

    if (existing) {
      throw new BadRequestException('Role code already exists in this tenant');
    }

    const role = this.rolesRepository.create({
      tenantId,
      code: input.code.toLowerCase().trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isSystem: false,
      isActive: input.isActive ?? true,
      permissions: input.permissions,
    });

    return this.rolesRepository.save(role);
  }

  async updateRole(roleId: string, tenantId: string, input: UpdateTenantRoleDto) {
    const role = await this.rolesRepository.findOne({ where: { id: roleId, tenantId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem && IMMUTABLE_SYSTEM_TENANT_ROLE_CODES.some((code) => code === role.code)) {
      throw new BadRequestException('Los roles de sistema tienen permisos fijos y no se pueden editar');
    }

    if (input.code && input.code.toLowerCase().trim() !== role.code) {
      const existing = await this.rolesRepository.findOne({
        where: { tenantId, code: input.code.toLowerCase().trim() },
      });
      if (existing && existing.id !== role.id) {
        throw new BadRequestException('Role code already exists in this tenant');
      }
      if (!role.isSystem) {
        role.code = input.code.toLowerCase().trim();
      }
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

    return this.rolesRepository.save(role);
  }

  async createMembership(tenantId: string, input: CreateTenantMembershipDto) {
    await this.ensureSystemRoles(tenantId);

    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const role = await this.getTenantRoleOrThrow(tenantId, input.roleId);
    const plan = await this.resolveTenantPlanAccess(tenantId);

    const adminUsersLimit = plan.limits.admin_users;
    if (typeof adminUsersLimit === 'number') {
      const membershipsCount = await this.membershipsRepository
        .createQueryBuilder('m')
        .innerJoin('m.user', 'u')
        .where('m.tenantId = :tenantId', { tenantId })
        .andWhere('m.isActive = :active', { active: true })
        .andWhere('u.isPlatformAdmin = :ipa', { ipa: false })
        .getCount();
      if (membershipsCount >= adminUsersLimit) {
        throw new BadRequestException('This subscription plan reached the maximum number of users');
      }
    }

    let user = await this.usersRepository.findOne({
      where: { email: input.email.toLowerCase().trim() },
    });

    let generatedPassword: string | null = null;

    try {
      if (!user) {
        generatedPassword = input.password?.trim() || this.createTemporaryPassword();
        this.logger.log(`Creating new user for email=${input.email}`);
        user = await this.usersRepository.save({
          fullName: input.fullName.trim(),
          email: input.email.toLowerCase().trim(),
          passwordHash: await bcrypt.hash(generatedPassword, 10),
          isActive: true,
          isPlatformAdmin: false,
          platformRole: 'tenant_admin',
          tenantId,
        });
        this.logger.log(`Created user ${user.id}`);
      } else {
        await this.assertUserCanJoinTenantAsMember(user, tenantId);
        this.logger.log(`Updating existing user ${user.id}`);
        user.fullName = input.fullName.trim();
        user.email = input.email.toLowerCase().trim();
        await this.usersRepository.save(user);
      }
    } catch (err) {
      this.logger.error('Error creating/updating user for tenant membership', err as any);
      throw err;
    }

    const existingMembership = await this.membershipsRepository.findOne({
      where: { tenantId, userId: user.id },
    });
    if (existingMembership) {
      throw new BadRequestException('User already belongs to this tenant');
    }

    let linkedStaffId: string | null = null;
    if (role.code === STAFF_ROLE_CODE) {
      linkedStaffId = await this.assertLinkedStaffIdForTenant(tenantId, input.linkedStaffId);
    }

    let membership;
    try {
      this.logger.log(`Creating membership for tenant=${tenantId} user=${user.id} role=${role.code}`);
      membership = await this.membershipsRepository.save({
        tenantId,
        userId: user.id,
        roleId: role.id,
        role: role.code,
        linkedStaffId,
        isActive: input.isActive ?? true,
        ...resolveTenantMembershipAccess(tenant.plan, role.permissions),
      });
      this.logger.log(`Created membership ${membership.id}`);
    } catch (err) {
      this.logger.error('Error creating membership', err as any);
      this.rethrowIfMembershipLinkedStaffUniqueConflict(err);
    }

    if (!user.isPlatformAdmin) {
      await this.usersRepository.update({ id: user.id }, { tenantId });
      user.tenantId = tenantId;
    }

    if (generatedPassword) {
      await this.mailService.sendWelcomeEmail({
        to: user.email,
        tenantId,
        recipientName: user.fullName,
        tenantName: tenant?.name ?? null,
        temporaryPassword: generatedPassword,
      });
    }

    return {
      membership,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        tenantId: user.tenantId,
      },
      generatedPassword,
    };
  }

  async updateMembership(membershipId: string, tenantId: string, input: UpdateTenantMembershipDto) {
    await this.ensureSystemRoles(tenantId);

    const membership = await this.membershipsRepository.findOne({
      where: { id: membershipId, tenantId },
      relations: ['user', 'roleDefinition'],
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (!membership.user) {
      throw new NotFoundException('Membership user not found');
    }

    if (input.email && input.email.toLowerCase().trim() !== membership.user.email) {
      const normalizedEmail = input.email.toLowerCase().trim();
      const existingUser = await this.usersRepository.findOne({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== membership.user.id) {
        throw new BadRequestException('User email already exists');
      }
      membership.user.email = normalizedEmail;
    }

    if (input.fullName !== undefined) {
      membership.user.fullName = input.fullName;
    }

    const trimmedRoleId = typeof input.roleId === 'string' ? input.roleId.trim() : '';
    const resolvedRole = trimmedRoleId
      ? await this.getTenantRoleOrThrow(tenantId, trimmedRoleId)
      : membership.roleDefinition;

    if (resolvedRole) {
      membership.roleId = resolvedRole.id;
      membership.role = resolvedRole.code;
      membership.roleDefinition = resolvedRole;
    }

    const effectiveCode =
      membership.roleDefinition?.code ?? membership.role;
    if (effectiveCode === STAFF_ROLE_CODE) {
      const raw =
        input.linkedStaffId !== undefined ? input.linkedStaffId : membership.linkedStaffId;
      membership.linkedStaffId = await this.assertLinkedStaffIdForTenant(tenantId, raw, {
        exceptMembershipId: membership.id,
      });
    } else {
      membership.linkedStaffId = null;
    }

    Object.assign(membership, {
      isActive: input.isActive ?? membership.isActive,
    });

    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (tenant && resolvedRole) {
      const rolePermissions = resolvedRole.permissions ?? [];
      const access = resolveTenantMembershipAccess(tenant.plan, rolePermissions);
      membership.allowedModules = access.allowedModules.length > 0 ? access.allowedModules : null;
      membership.permissions = access.permissions.length > 0 ? access.permissions : null;
    }

    try {
      this.logger.log(`Saving user ${membership.user.id} and membership ${membership.id}`);
      await this.usersRepository.save(membership.user);
      const savedMembership = await this.membershipsRepository.save(membership);
      this.logger.log(`Saved membership ${savedMembership.id}`);

      return this.membershipsRepository.findOne({
        where: { id: membership.id },
        relations: ['user', 'roleDefinition'],
      });
    } catch (err) {
      this.logger.error('Error saving membership/user', err as any);
      this.rethrowIfMembershipLinkedStaffUniqueConflict(err);
    }
  }

  async resetMembershipPassword(membershipId: string, tenantId: string) {
    const membership = await this.membershipsRepository.findOne({
      where: { id: membershipId, tenantId },
      relations: ['user'],
    });

    if (!membership || !membership.user) {
      throw new NotFoundException('Membership not found');
    }

    const temporaryPassword = this.createTemporaryPassword();
    membership.user.passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await this.usersRepository.save(membership.user);

    await this.mailService.sendPasswordResetEmail({
      to: membership.user.email,
      tenantId,
      recipientName: membership.user.fullName,
      temporaryPassword,
    });

    return {
      message: `Se generó una contraseña temporal para ${membership.user.email}. Si el SMTP está configurado, también se envió por correo.`,
      generatedPassword: temporaryPassword,
      email: membership.user.email,
    };
  }

  private createTemporaryPassword() {
    return `Temp${Math.random().toString(36).slice(2, 8)}!9`;
  }

  private async getTenantRoleOrThrow(tenantId: string, roleId: string) {
    const role = await this.rolesRepository.findOne({
      where: { id: roleId, tenantId, isActive: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async ensureDefaultRole(tenantId: string) {
    const roles = await this.ensureSystemRoles(tenantId);
    const adminRole = roles.find((role) => role.code === ADMINISTRATOR_ROLE_CODE);

    if (!adminRole) {
      throw new NotFoundException('Default tenant role not found');
    }

    return adminRole;
  }

  async ensureSystemRoles(tenantId: string) {
    const existingRoles = await this.rolesRepository.find({
      where: { tenantId },
    });
    const savedRoles: TenantRoleEntity[] = [];

    for (const definition of DEFAULT_TENANT_ROLE_DEFINITIONS) {
      const existingRole = existingRoles.find((role) => role.code === definition.code);
      const role = existingRole ?? this.rolesRepository.create({
        tenantId,
        code: definition.code,
      });

      const roleChanged =
        !existingRole
        || role.name !== definition.name
        || role.description !== definition.description
        || role.isSystem !== true
        || role.isActive !== true
        || !this.arraysAreEqual(role.permissions, definition.permissions);

      if (!roleChanged) {
        savedRoles.push(role);
        continue;
      }

      role.name = definition.name;
      role.description = definition.description;
      role.isSystem = true;
      role.isActive = true;
      role.permissions = [...definition.permissions];
      savedRoles.push(await this.rolesRepository.save(role));
    }

    return savedRoles;
  }

  private async resolveTenantPlanAccess(tenantId: string) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return getPlanAccessDefinition(tenant.plan);
  }
}
