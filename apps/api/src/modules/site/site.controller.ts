import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { CreatePageDto } from './dto/create-page.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SiteService } from './site.service';

@ApiTags('Site')
@Controller('site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get('public')
  getPublicSite(@Query('host') host: string, @Query('slug') slug?: string) {
    return this.siteService.getPublicSiteByHost(host, slug);
  }

  @Get('robots.txt')
  async getRobots(@Query('host') host: string, @Res() res: Response) {
    const body = await this.siteService.getRobotsTxt(host);
    res.type('text/plain').send(body);
  }

  @Get('sitemap.xml')
  async getSitemap(@Query('host') host: string, @Res() res: Response) {
    const body = await this.siteService.getSitemapXml(host);
    res.type('application/xml').send(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('templates')
  listTemplates() {
    return this.siteService.listTemplates();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Get('pages')
  listPages(@Query('tenantId') tenantId: string) {
    return this.siteService.listPages(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Post('pages')
  @Idempotent()
  createPage(@Body() input: CreatePageDto) {
    return this.siteService.createPage(input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Patch('pages/:pageId')
  @Idempotent()
  updatePage(@Param('pageId') pageId: string, @Query('tenantId') tenantId: string, @Body() input: UpdatePageDto) {
    return this.siteService.updatePage(pageId, tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Delete('pages/:pageId')
  @Idempotent()
  removePage(@Param('pageId') pageId: string, @Query('tenantId') tenantId: string) {
    return this.siteService.removePage(pageId, tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Get('sections')
  listSections(
    @Query('tenantId') tenantId: string,
    @Query('pageId') pageId?: string,
    @Query('scope') scope?: 'global' | 'page',
  ) {
    return this.siteService.listSections(tenantId, pageId, scope);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Post('sections')
  @Idempotent()
  createSection(@Body() input: CreateSectionDto) {
    return this.siteService.createSection(input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Patch('sections/:sectionId')
  @Idempotent()
  updateSection(
    @Param('sectionId') sectionId: string,
    @Query('tenantId') tenantId: string,
    @Body() input: UpdateSectionDto,
  ) {
    return this.siteService.updateSection(sectionId, tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Delete('sections/:sectionId')
  @Idempotent()
  removeSection(@Param('sectionId') sectionId: string, @Query('tenantId') tenantId: string) {
    return this.siteService.removeSection(sectionId, tenantId);
  }
}
