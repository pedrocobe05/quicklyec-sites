import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from 'src/modules/auth/platform-admin.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { CreateTenantDomainDto } from './dto/create-tenant-domain.dto';
import { CreateTenantMembershipDto } from './dto/create-tenant-membership.dto';
import { CreateTenantRoleDto } from './dto/create-tenant-role.dto';
import { UpdateTenantDomainDto } from './dto/update-tenant-domain.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { UpdateTenantMembershipDto } from './dto/update-tenant-membership.dto';
import { UpdateTenantRoleDto } from './dto/update-tenant-role.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('resolve')
  resolveByHost(@Query('host') host: string) {
    return this.tenantsService.resolveTenantByHost(host);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @Get('me')
  getCurrentTenant(@Req() req: { user: { sub: string }; query: { tenantId?: string } }) {
    const tenantId = req.query.tenantId;
    if (!tenantId) {
      return { message: 'Provide tenantId query param' };
    }
    return this.tenantsService.getTenantProfile(tenantId, req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('branding')
  @Patch('branding')
  @Idempotent()
  updateBranding(@Query('tenantId') tenantId: string, @Body() input: UpdateTenantBrandingDto) {
    return this.tenantsService.updateTenantBranding(tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('settings')
  @Patch('settings')
  @Idempotent()
  updateSettings(
    @Req() req: { user?: { isPlatformAdmin?: boolean } },
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateTenantSettingsDto,
  ) {
    if (input.mailConfig !== undefined && !req.user?.isPlatformAdmin) {
      throw new ForbiddenException(
        'Solo los administradores de plataforma pueden configurar el servidor de correo (SMTP).',
      );
    }
    return this.tenantsService.updateTenantSettings(tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard, PlatformAdminGuard)
  @TenantModuleAccess('settings')
  @Post('test-email')
  @Idempotent()
  sendTestEmail(@Query('tenantId') tenantId: string, @Body() input: SendTestEmailDto) {
    return this.tenantsService.sendTestEmail(tenantId, input.to);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('domains')
  @Post('domains')
  @Idempotent()
  createDomain(@Body() input: CreateTenantDomainDto) {
    return this.tenantsService.createTenantDomain(input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('domains')
  @Patch('domains/:domainId')
  @Idempotent()
  updateDomain(@Param('domainId') domainId: string, @Query('tenantId') tenantId: string, @Body() input: UpdateTenantDomainDto) {
    return this.tenantsService.updateTenantDomain(domainId, tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('domains')
  @Delete('domains/:domainId')
  @Idempotent()
  removeDomain(@Param('domainId') domainId: string, @Query('tenantId') tenantId: string) {
    return this.tenantsService.removeTenantDomain(domainId, tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('users')
  @Get('memberships')
  listMemberships(@Query('tenantId') tenantId: string) {
    return this.tenantsService.listMemberships(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('users')
  @Post('memberships')
  @Idempotent()
  createMembership(@Query('tenantId') tenantId: string, @Body() input: CreateTenantMembershipDto) {
    return this.tenantsService.createMembership(tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('users')
  @Patch('memberships/:membershipId')
  @Idempotent()
  updateMembership(
    @Param('membershipId') membershipId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateTenantMembershipDto,
  ) {
    return this.tenantsService.updateMembership(membershipId, tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('users')
  @Post('memberships/:membershipId/reset-password')
  @Idempotent()
  resetMembershipPassword(
    @Param('membershipId') membershipId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.tenantsService.resetMembershipPassword(membershipId, tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('roles')
  @Get('roles')
  listRoles(@Query('tenantId') tenantId: string) {
    return this.tenantsService.listRoles(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('roles')
  @Post('roles')
  @Idempotent()
  createRole(@Query('tenantId') tenantId: string, @Body() input: CreateTenantRoleDto) {
    return this.tenantsService.createRole(tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('roles')
  @Patch('roles/:roleId')
  @Idempotent()
  updateRole(@Param('roleId') roleId: string, @Query('tenantId') tenantId: string, @Body() input: UpdateTenantRoleDto) {
    return this.tenantsService.updateRole(roleId, tenantId, input);
  }
}
