import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminUserEntity,
  TenantBrandingEntity,
  TenantDomainEntity,
  TenantEntity,
  TenantSettingEntity,
  TenantMembershipEntity,
  TenantRoleEntity,
  SubscriptionPlanEntity,
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
  getPlanAccessDefinition,
  getPlanMetadata,
  intersectTenantModules,
  normalizePlanCode,
} from './tenant-access.constants';

@Injectable()
export class TenantsService {
  constructor(
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
    @InjectRepository(AdminUserEntity)
    private readonly usersRepository: Repository<AdminUserEntity>,
    @InjectRepository(TenantRoleEntity)
    private readonly rolesRepository: Repository<TenantRoleEntity>,
    @InjectRepository(SubscriptionPlanEntity)
    private readonly plansRepository: Repository<SubscriptionPlanEntity>,
    private readonly mailService: MailService,
    private readonly filesService: FilesService,
  ) {}

  normalizeHost(host: string) {
    return host.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
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
    const tenant = await this.tenantsRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const [settings, branding, domains, planDefinition, membership] = await Promise.all([
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
    ]);

    const normalizedPlanCode = normalizePlanCode(tenant.plan);
    const fallbackPlanDefinition = getPlanAccessDefinition(normalizedPlanCode);
    const planModules = planDefinition?.tenantModules?.length
      ? planDefinition.tenantModules
      : fallbackPlanDefinition.modules;
    const rolePermissions = membership?.roleDefinition?.permissions ?? [];
    const effectiveModules = membership ? intersectTenantModules(planModules, rolePermissions) : planModules;
    const [resolvedLogoUrl, resolvedFaviconUrl] = await Promise.all([
      this.filesService.resolveStoredReference(branding?.logoUrl, tenantId),
      this.filesService.resolveStoredReference(branding?.faviconUrl, tenantId),
    ]);

    return {
      tenant: {
        ...tenant,
        plan: normalizedPlanCode,
      },
      settings,
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
    };
  }

  async updateTenantBranding(tenantId: string, input: UpdateTenantBrandingDto) {
    let branding = await this.brandingRepository.findOne({ where: { tenantId } });
    if (!branding) {
      branding = this.brandingRepository.create({ tenantId });
    }

    Object.assign(branding, input);
    return this.brandingRepository.save(branding);
  }

  async updateTenantSettings(tenantId: string, input: UpdateTenantSettingsDto) {
    let settings = await this.settingsRepository.findOne({ where: { tenantId } });
    if (!settings) {
      settings = this.settingsRepository.create({ tenantId });
    }

    Object.assign(settings, input);
    return this.settingsRepository.save(settings);
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
    if (input.isPrimary) {
      await this.domainsRepository.update({ tenantId: input.tenantId, isPrimary: true }, { isPrimary: false });
    }

    return this.domainsRepository.save({
      tenantId: input.tenantId,
      domain: this.normalizeHost(input.domain),
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

    if (input.isPrimary) {
      await this.domainsRepository.update({ tenantId, isPrimary: true }, { isPrimary: false });
    }

    Object.assign(domain, {
      domain: input.domain ? this.normalizeHost(input.domain) : domain.domain,
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

  listMemberships(tenantId: string) {
    return this.membershipsRepository.find({
      where: { tenantId },
      relations: ['user', 'roleDefinition'],
      order: { role: 'ASC' },
    });
  }

  listRoles(tenantId: string) {
    return this.rolesRepository.find({
      where: { tenantId },
      order: { isSystem: 'DESC', name: 'ASC' },
    });
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
    const role = await this.getTenantRoleOrThrow(tenantId, input.roleId);
    const plan = await this.resolveTenantPlanAccess(tenantId);

    const adminUsersLimit = plan.limits.admin_users;
    if (typeof adminUsersLimit === 'number') {
      const membershipsCount = await this.membershipsRepository.count({
        where: { tenantId, isActive: true },
      });
      if (membershipsCount >= adminUsersLimit) {
        throw new BadRequestException('This subscription plan reached the maximum number of users');
      }
    }

    let user = await this.usersRepository.findOne({
      where: { email: input.email.toLowerCase().trim() },
    });

    let generatedPassword: string | null = null;

    if (!user) {
      generatedPassword = input.password?.trim() || this.createTemporaryPassword();
      user = await this.usersRepository.save({
        fullName: input.fullName.trim(),
        email: input.email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(generatedPassword, 10),
        isActive: true,
        isPlatformAdmin: false,
        platformRole: 'tenant_admin',
      });
    } else {
      user.fullName = input.fullName.trim();
      user.email = input.email.toLowerCase().trim();
      await this.usersRepository.save(user);
    }

    const existingMembership = await this.membershipsRepository.findOne({
      where: { tenantId, userId: user.id },
    });
    if (existingMembership) {
      throw new BadRequestException('User already belongs to this tenant');
    }

    const membership = await this.membershipsRepository.save({
      tenantId,
      userId: user.id,
      roleId: role.id,
      role: role.code,
      isActive: input.isActive ?? true,
      allowedModules: null,
      permissions: null,
    });

    if (generatedPassword) {
      const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
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
      },
      generatedPassword,
    };
  }

  async updateMembership(membershipId: string, tenantId: string, input: UpdateTenantMembershipDto) {
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

    if (input.roleId) {
      const role = await this.getTenantRoleOrThrow(tenantId, input.roleId);
      membership.roleId = role.id;
      membership.role = role.code;
    }

    Object.assign(membership, {
      isActive: input.isActive ?? membership.isActive,
    });

    await this.usersRepository.save(membership.user);
    return this.membershipsRepository.save(membership);
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
    const existing = await this.rolesRepository.findOne({
      where: { tenantId, code: ADMINISTRATOR_ROLE_CODE },
    });

    if (existing) {
      return existing;
    }

    const definition = DEFAULT_TENANT_ROLE_DEFINITIONS[0];
    return this.rolesRepository.save({
      tenantId,
      code: definition.code,
      name: definition.name,
      description: definition.description,
      isSystem: true,
      isActive: true,
      permissions: [...definition.permissions],
    });
  }

  private async resolveTenantPlanAccess(tenantId: string) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return getPlanAccessDefinition(tenant.plan);
  }
}
