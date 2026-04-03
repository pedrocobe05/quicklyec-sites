import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from 'src/modules/auth/platform-admin.guard';
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
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('plans')
  listPlans() {
    return this.platformService.listPlans();
  }

  @Get('users')
  listUsers() {
    return this.platformService.listUsers();
  }

  @Get('roles')
  listRoles() {
    return this.platformService.listRoles();
  }

  @Post('roles')
  createRole(@Body() input: CreatePlatformRoleDto) {
    return this.platformService.createRole(input);
  }

  @Patch('roles/:roleId')
  updateRole(@Param('roleId') roleId: string, @Body() input: UpdatePlatformRoleDto) {
    return this.platformService.updateRole(roleId, input);
  }

  @Delete('roles/:roleId')
  removeRole(@Param('roleId') roleId: string) {
    return this.platformService.removeRole(roleId);
  }

  @Get('settings')
  getSettings() {
    return this.platformService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() input: UpdatePlatformSettingsDto) {
    return this.platformService.updateSettings(input);
  }

  @Post('users')
  createUser(@Body() input: CreatePlatformUserDto) {
    return this.platformService.createUser(input);
  }

  @Patch('users/:userId')
  updateUser(@Param('userId') userId: string, @Body() input: UpdatePlatformUserDto) {
    return this.platformService.updateUser(userId, input);
  }

  @Delete('users/:userId')
  removeUser(@Param('userId') userId: string) {
    return this.platformService.removeUser(userId);
  }

  @Post('plans')
  createPlan(@Body() input: CreateSubscriptionPlanDto) {
    return this.platformService.createPlan(input);
  }

  @Patch('plans/:planId')
  updatePlan(@Param('planId') planId: string, @Body() input: UpdateSubscriptionPlanDto) {
    return this.platformService.updatePlan(planId, input);
  }

  @Get('tenants')
  listTenants() {
    return this.platformService.listTenants();
  }

  @Post('tenants')
  createTenant(@Body() input: CreatePlatformTenantDto) {
    return this.platformService.createTenant(input);
  }

  @Patch('tenants/:tenantId')
  updateTenant(@Param('tenantId') tenantId: string, @Body() input: UpdatePlatformTenantDto) {
    return this.platformService.updateTenant(tenantId, input);
  }

  @Patch('tenants/:tenantId/plan')
  updateTenantPlan(@Param('tenantId') tenantId: string, @Body() input: UpdateTenantPlanDto) {
    return this.platformService.updateTenantPlan(tenantId, input.plan);
  }

  @Delete('tenants/:tenantId')
  removeTenant(@Param('tenantId') tenantId: string) {
    return this.platformService.removeTenant(tenantId);
  }

  @Post('memberships')
  createMembership(@Body() input: CreatePlatformMembershipDto) {
    return this.platformService.createMembership(input);
  }
}
