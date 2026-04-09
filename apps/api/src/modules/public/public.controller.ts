import { Controller, Get, Headers, Post, Query, Body, Res } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AppointmentsService } from 'src/modules/appointments/appointments.service';
import { CreatePublicAppointmentDto } from 'src/modules/appointments/dto/create-public-appointment.dto';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { ServicesService } from 'src/modules/services/services.service';
import { SiteService } from 'src/modules/site/site.service';
import { TenantsService } from 'src/modules/tenants/tenants.service';
import { getPlanMetadata, normalizePlanCode } from 'src/modules/tenants/tenant-access.constants';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly siteService: SiteService,
    private readonly tenantsService: TenantsService,
    private readonly servicesService: ServicesService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Get('site')
  getSite(@Headers('host') headerHost: string, @Query('host') queryHost?: string, @Query('slug') slug?: string) {
    return this.siteService.getPublicSiteByHost(queryHost ?? headerHost, slug);
  }

  @Get('services')
  async getServices(@Headers('host') headerHost: string, @Query('host') queryHost?: string) {
    const resolved = await this.tenantsService.resolveTenantByHost(queryHost ?? headerHost);
    if (!(resolved.setting?.publicSiteEnabled ?? true)) {
      throw new NotFoundException('Public site is disabled');
    }
    return this.servicesService.findPublicByTenant(resolved.tenant.id);
  }

  @Get('availability')
  async getAvailability(
    @Headers('host') headerHost: string,
    @Query('host') queryHost: string | undefined,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
    @Query('staffId') staffId?: string,
  ) {
    const resolved = await this.tenantsService.resolveTenantByHost(queryHost ?? headerHost);
    const bookingEnabled = Boolean(
      (resolved.setting?.bookingEnabled ?? true)
      && getPlanMetadata(normalizePlanCode(resolved.tenant.plan)).features.includes('online_booking'),
    );
    if (!bookingEnabled) {
      throw new BadRequestException('Las reservas online no están disponibles para este sitio');
    }
    return this.appointmentsService.getAvailability({
      tenantId: resolved.tenant.id,
      serviceId,
      date,
      staffId,
    });
  }

  @Post('appointments')
  @Idempotent()
  async createAppointment(
    @Headers('host') headerHost: string,
    @Query('host') queryHost: string | undefined,
    @Body() input: CreatePublicAppointmentDto,
  ) {
    const resolved = await this.tenantsService.resolveTenantByHost(queryHost ?? headerHost);
    const bookingEnabled = Boolean(
      (resolved.setting?.bookingEnabled ?? true)
      && getPlanMetadata(normalizePlanCode(resolved.tenant.plan)).features.includes('online_booking'),
    );
    if (!bookingEnabled) {
      throw new BadRequestException('Las reservas online no están disponibles para este sitio');
    }
    return this.appointmentsService.createPublicAppointment(resolved.tenant.id, input);
  }

  @Get('robots.txt')
  async robots(@Headers('host') headerHost: string, @Query('host') queryHost: string | undefined, @Res() res: Response) {
    const body = await this.siteService.getRobotsTxt(queryHost ?? headerHost);
    res.type('text/plain').send(body);
  }

  @Get('sitemap.xml')
  async sitemap(@Headers('host') headerHost: string, @Query('host') queryHost: string | undefined, @Res() res: Response) {
    const body = await this.siteService.getSitemapXml(queryHost ?? headerHost);
    res.type('application/xml').send(body);
  }
}
