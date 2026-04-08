import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import dataSource from 'src/common/database/data-source';
import {
  AdminUserEntity,
  AppointmentEntity,
  AvailabilityRuleEntity,
  CustomerEntity,
  PlatformRoleEntity,
  PlatformSettingEntity,
  ScheduleBlockEntity,
  ServiceEntity,
  SitePageEntity,
  SiteSectionEntity,
  SiteTemplateEntity,
  StaffEntity,
  StaffServiceEntity,
  TenantBrandingEntity,
  TenantDomainEntity,
  TenantEntity,
  TenantMembershipEntity,
  TenantRoleEntity,
  TenantSettingEntity,
  SubscriptionPlanEntity,
} from 'src/common/entities';
import {
  DEFAULT_TENANT_ROLE_DEFINITIONS,
  PLAN_ACCESS_DEFINITIONS,
  getPlanMetadata,
} from 'src/modules/tenants/tenant-access.constants';

async function resetTenant(dataSourceRef: DataSource, slug: string) {
  const tenantRepository = dataSourceRef.getRepository(TenantEntity);
  const tenant = await tenantRepository.findOne({ where: { slug } });
  if (tenant) {
    await tenantRepository.delete({ id: tenant.id });
  }
}

async function main() {
  const demoTenantId = '7c039917-7b50-4abb-a562-341684e63509';
  const healthPrimeTenantId = 'f3d1fb76-b58c-4c9a-a349-4a7697694cd0';
  await dataSource.initialize();

  await resetTenant(dataSource, 'paolamendozanails');
  await resetTenant(dataSource, 'healthprimeclinic');

  const tenantRepository = dataSource.getRepository(TenantEntity);
  const domainRepository = dataSource.getRepository(TenantDomainEntity);
  const settingsRepository = dataSource.getRepository(TenantSettingEntity);
  const brandingRepository = dataSource.getRepository(TenantBrandingEntity);
  const templateRepository = dataSource.getRepository(SiteTemplateEntity);
  const pageRepository = dataSource.getRepository(SitePageEntity);
  const sectionRepository = dataSource.getRepository(SiteSectionEntity);
  const serviceRepository = dataSource.getRepository(ServiceEntity);
  const staffRepository = dataSource.getRepository(StaffEntity);
  const staffServiceRepository = dataSource.getRepository(StaffServiceEntity);
  const availabilityRuleRepository = dataSource.getRepository(AvailabilityRuleEntity);
  const scheduleBlockRepository = dataSource.getRepository(ScheduleBlockEntity);
  const customerRepository = dataSource.getRepository(CustomerEntity);
  const appointmentRepository = dataSource.getRepository(AppointmentEntity);
  const userRepository = dataSource.getRepository(AdminUserEntity);
  const membershipRepository = dataSource.getRepository(TenantMembershipEntity);
  const roleRepository = dataSource.getRepository(TenantRoleEntity);
  const plansRepository = dataSource.getRepository(SubscriptionPlanEntity);
  const platformRoleRepository = dataSource.getRepository(PlatformRoleEntity);
  const platformSettingRepository = dataSource.getRepository(PlatformSettingEntity);

  let superAdminRole = await platformRoleRepository.findOne({
    where: { code: 'super_admin' },
  });

  if (!superAdminRole) {
    superAdminRole = platformRoleRepository.create({
      code: 'super_admin',
      name: 'Super administrador',
      description: 'Acceso total a la plataforma',
      isSystem: true,
      isActive: true,
      permissions: ['platform.users', 'platform.roles', 'platform.tenants', 'platform.settings'],
    });
  } else {
    superAdminRole.name = 'Super administrador';
    superAdminRole.description = 'Acceso total a la plataforma';
    superAdminRole.isSystem = true;
    superAdminRole.isActive = true;
    superAdminRole.permissions = ['platform.users', 'platform.roles', 'platform.tenants', 'platform.settings'];
  }

  await platformRoleRepository.save(superAdminRole);

  const existingPlatformSetting = (await platformSettingRepository.find({
    order: { createdAt: 'ASC' },
    take: 1,
  }))[0];
  if (!existingPlatformSetting) {
    await platformSettingRepository.save({
      platformName: 'Quickly Sites',
      supportEmail: 'sites@quicklyec.com',
      supportPhone: null,
      publicAppUrl: 'http://localhost:5174',
      quicklysitesBaseDomain: 'quicklyecsites.local',
      defaultSenderName: 'Quickly Sites',
      defaultSenderEmail: 'sites@quicklyec.com',
      metadata: null,
    });
  }

  await plansRepository.upsert(
    [
      {
        code: 'basic',
        name: 'Básico',
        description: PLAN_ACCESS_DEFINITIONS.basic.description,
        isActive: true,
        tenantModules: PLAN_ACCESS_DEFINITIONS.basic.modules,
        platformModules: ['platform.tenants', 'platform.plans', 'platform.users'],
        metadata: getPlanMetadata('basic'),
      },
      {
        code: 'pro',
        name: 'Pro',
        description: PLAN_ACCESS_DEFINITIONS.pro.description,
        isActive: true,
        tenantModules: PLAN_ACCESS_DEFINITIONS.pro.modules,
        platformModules: ['platform.tenants', 'platform.plans', 'platform.users'],
        metadata: getPlanMetadata('pro'),
      },
      {
        code: 'premium',
        name: 'Premium',
        description: PLAN_ACCESS_DEFINITIONS.premium.description,
        isActive: true,
        tenantModules: PLAN_ACCESS_DEFINITIONS.premium.modules,
        platformModules: ['platform.tenants', 'platform.plans', 'platform.users'],
        metadata: getPlanMetadata('premium'),
      },
    ],
    ['code'],
  );

  let template = await templateRepository.findOne({ where: { code: 'beauty-nails' } });
  if (!template) {
    template = await templateRepository.save({
      code: 'beauty-nails',
      name: 'Beauty Nails',
      description: 'Landing template for nails, spa and beauty studios',
      isActive: true,
    });
  }

  const tenant = await tenantRepository.save({
    id: demoTenantId,
    name: 'Paola Mendoza Nails',
    slug: 'paolamendozanails',
    status: 'active',
    plan: 'basic',
  });

  let adminRole = await roleRepository.findOne({
    where: { tenantId: tenant.id, code: DEFAULT_TENANT_ROLE_DEFINITIONS[0].code },
  });
  if (!adminRole) {
    adminRole = await roleRepository.save({
      tenantId: tenant.id,
      code: DEFAULT_TENANT_ROLE_DEFINITIONS[0].code,
      name: DEFAULT_TENANT_ROLE_DEFINITIONS[0].name,
      description: DEFAULT_TENANT_ROLE_DEFINITIONS[0].description,
      isSystem: true,
      isActive: true,
      permissions: [...DEFAULT_TENANT_ROLE_DEFINITIONS[0].permissions],
    });
  }

  await domainRepository.save([
    {
      tenantId: tenant.id,
      domain: 'paolamendozanails.quicklyecsites.com',
      type: 'subdomain',
      isPrimary: true,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      sslStatus: 'active',
    },
    {
      tenantId: tenant.id,
      domain: 'www.paolamendozanails.com',
      type: 'custom',
      isPrimary: false,
      verificationStatus: 'pending',
      verifiedAt: null,
      sslStatus: 'pending',
    },
  ]);

  await settingsRepository.save({
    tenantId: tenant.id,
    publicSiteEnabled: true,
    bookingEnabled: false,
    timezone: 'America/Guayaquil',
    locale: 'es-EC',
    currency: 'USD',
    contactEmail: 'hola@paolamendozanails.com',
    contactPhone: '+593 98 123 4567',
    whatsappNumber: '+593 98 123 4567',
    siteIndexingEnabled: true,
    defaultSeoTitle: 'Paola Mendoza Nails | Manicure y spa',
    defaultSeoDescription: 'Conoce manicure, pedicure y tratamientos spa de Paola Mendoza Nails.',
    defaultOgImageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371',
    canonicalDomain: 'paolamendozanails.quicklyecsites.com',
  });

  await brandingRepository.save({
    tenantId: tenant.id,
    logoUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
    faviconUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
    primaryColor: '#B9A89A',
    secondaryColor: '#F4EEE8',
    accentColor: '#7A685B',
    fontFamily: 'Cormorant Garamond',
    borderRadius: '1.75rem',
    buttonStyle: 'pill',
    customCss: null,
  });

  const homePage = await pageRepository.save({
    tenantId: tenant.id,
    templateId: template.id,
    slug: 'home',
    title: 'Paola Mendoza Nails',
    isHome: true,
    isPublished: true,
    isIndexable: true,
    seoTitle: 'Paola Mendoza Nails | Reserva manicure y spa online',
    seoDescription: 'Sitio oficial de Paola Mendoza Nails. Servicios de manicure, pedicure, spa de manos y reservas online.',
    canonicalUrl: 'https://paolamendozanails.quicklyecsites.com',
    ogTitle: 'Paola Mendoza Nails',
    ogDescription: 'Reserva tu próximo servicio beauty online.',
    ogImageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371',
    metaRobots: 'index,follow',
  });

  const [servicesPage, contactPage] = await pageRepository.save([
    {
      tenantId: tenant.id,
      templateId: template.id,
      slug: 'servicios',
      title: 'Servicios',
      isHome: false,
      isPublished: true,
      isIndexable: true,
      seoTitle: 'Servicios | Paola Mendoza Nails',
      seoDescription: 'Servicios disponibles de Paola Mendoza Nails.',
      canonicalUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogImageUrl: null,
      metaRobots: 'index,follow',
    },
    {
      tenantId: tenant.id,
      templateId: template.id,
      slug: 'contacto',
      title: 'Contacto',
      isHome: false,
      isPublished: true,
      isIndexable: true,
      seoTitle: 'Contacto | Paola Mendoza Nails',
      seoDescription: 'Datos de contacto de Paola Mendoza Nails.',
      canonicalUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogImageUrl: null,
      metaRobots: 'index,follow',
    },
  ]);

  await sectionRepository.save([
    {
      tenantId: tenant.id,
      pageId: null,
      scope: 'global',
      type: 'header',
      variant: 'default',
      position: 1,
      isVisible: true,
      settings: {},
      content: {
        kicker: 'Nail Studio Boutique',
        title: 'Paola Mendoza Nails',
        subtitle: 'Manicure, soft gel y rituales de cuidado con una estética limpia, suave y elegante.',
        ctaLabel: 'Agendar valoración',
        ctaUrl: '/contacto',
      },
    },
    {
      tenantId: tenant.id,
      pageId: null,
      scope: 'global',
      type: 'footer',
      variant: 'default',
      position: 2,
      isVisible: true,
      settings: {},
      content: {
        text: 'Diseñamos experiencias de manicure y cuidado con atención meticulosa, acabados refinados y una atmósfera serena.',
        address: 'Urdesa Central, Guayaquil, Ecuador',
        hours: 'Lunes a sábado · 09:00 a 19:00',
        instagram: '@paolamendozanails',
        footerWhatsapp: '+593 99 123 4567',
      },
    },
    {
      tenantId: tenant.id,
      pageId: homePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'hero-editorial',
      position: 1,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="hero-editorial">
            <div class="hero-copy">
              <span class="eyebrow">Nails Studio</span>
              <h1>Una presencia digital suave, refinada y lista para enamorar desde el primer vistazo.</h1>
              <p>Este bloque demuestra cómo Quickly Sites puede construir una landing mucho más aspiracional y altamente personalizable, manteniendo una estética limpia, premium y coherente con un estudio de uñas moderno.</p>
              <div class="hero-actions">
                <a href="/servicios" class="primary-link">Ver servicios</a>
                <a href="/contacto" class="secondary-link">Contactar ahora</a>
              </div>
            </div>
            <div class="hero-visual">
              <div class="hero-shot">
                <img src="{{asset:hero-main}}" alt="Detalle premium de manicure" />
              </div>
              <article class="panel panel-soft">
                <span class="panel-label">Experiencia</span>
                <strong>Elegante</strong>
                <p>Ideal para estudios boutique, spa urbano y negocios beauty con enfoque premium.</p>
              </article>
            </div>
          </section>
        `,
        css: `
          & .hero-editorial {
            display: grid;
            gap: 1.5rem;
            align-items: stretch;
          }
          @media (min-width: 960px) {
            & .hero-editorial {
              grid-template-columns: 1.05fr 0.95fr;
            }
          }
          & .hero-copy,
          & .panel,
          & .hero-shot {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 2rem;
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,239,233,0.86));
            box-shadow: 0 24px 80px rgba(15, 23, 42, 0.07);
          }
          & .hero-copy {
            padding: clamp(2rem, 4vw, 4rem);
          }
          & .eyebrow,
          & .panel-label {
            display: inline-block;
            margin-bottom: 1rem;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.36em;
            color: #8c7767;
          }
          & h1 {
            margin: 0;
            font-size: clamp(2.8rem, 6vw, 5.8rem);
            line-height: 0.94;
            color: #1f2937;
          }
          & p {
            margin: 1.5rem 0 0;
            max-width: 60ch;
            font-size: 1.02rem;
            line-height: 1.95;
            color: #5b6574;
          }
          & .hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.85rem;
            margin-top: 2rem;
          }
          & .primary-link,
          & .secondary-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 3rem;
            padding: 0 1.35rem;
            border-radius: 999px;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
          }
          & .primary-link {
            background: #1f2937;
            color: #ffffff;
          }
          & .secondary-link {
            border: 1px solid rgba(15,23,42,0.12);
            background: rgba(255,255,255,0.74);
            color: #334155;
          }
          & .hero-visual {
            display: grid;
            gap: 1.5rem;
          }
          & .hero-shot {
            position: relative;
            overflow: hidden;
            min-height: 34rem;
            background: #f4ede6;
          }
          & .hero-shot img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          & .panel {
            padding: 1.75rem;
          }
          & .panel strong {
            display: block;
            font-size: 2rem;
            line-height: 1;
            color: #1f2937;
          }
          & .panel p {
            margin-top: 1rem;
          }
          & .panel-soft {
            background: linear-gradient(180deg, rgba(249,245,241,0.96), rgba(241,231,223,0.92));
          }
        `,
      },
    },
    {
      tenantId: tenant.id,
      pageId: homePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'signature-manifesto',
      position: 2,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <div class="signature-grid">
            <article class="signature-card">
              <span class="eyebrow">Filosofía</span>
              <h2>Una marca delicada también puede verse impecablemente premium.</h2>
              <p>Creamos una presencia visual sobria, limpia y serena para negocios de uñas y spa que quieren vender con elegancia sin perder cercanía.</p>
            </article>
            <article class="signature-note">
              <img src="{{asset:studio-ambient}}" alt="Studio de uñas editorial" />
              <div class="signature-note__copy">
                <span class="eyebrow">Experiencia</span>
                <p>Diseño minimalista, colores suaves y una narrativa cuidada para que cada visita al sitio se sienta como una extensión real del estudio.</p>
              </div>
            </article>
          </div>
        `,
        css: `
          & .signature-grid {
            display: grid;
            gap: 1.5rem;
          }
          @media (min-width: 900px) {
            & .signature-grid {
              grid-template-columns: 1.35fr 0.85fr;
              align-items: stretch;
            }
          }
          & .signature-card,
          & .signature-note {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 2rem;
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,240,234,0.88));
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
          }
          & .signature-card {
            padding: 2rem;
          }
          & .signature-note {
            overflow: hidden;
          }
          & .signature-note img {
            width: 100%;
            height: 16rem;
            object-fit: cover;
            display: block;
          }
          & .signature-note__copy {
            padding: 1.5rem;
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #7a685b;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0 0 1rem;
            font-size: clamp(2rem, 4vw, 3.4rem);
            line-height: 0.98;
            color: #1f2937;
          }
          & p {
            margin: 0;
            font-size: 1.02rem;
            line-height: 1.95;
            color: #5b6574;
          }
        `,
      },
    },
    {
      tenantId: tenant.id,
      pageId: homePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'service-signature',
      position: 3,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="signature-services">
            <header>
              <span class="eyebrow">Experiencia destacada</span>
              <h2>El catálogo puede presentarse con intención estética, no solo como una lista técnica.</h2>
            </header>
            <div class="signature-services__grid">
              <article>
                <img src="{{asset:service-premium}}" alt="Manicure premium" />
                <strong>Manicure premium</strong>
                <p>Acabado fino, detalle impecable y presentación editorial para servicios estrella.</p>
              </article>
              <article>
                <img src="{{asset:service-soft-gel}}" alt="Soft gel y diseño" />
                <strong>Soft gel & diseño</strong>
                <p>Una forma más elegante de comunicar creatividad, precisión y estilo.</p>
              </article>
              <article>
                <img src="{{asset:service-spa}}" alt="Rituales spa" />
                <strong>Rituales spa</strong>
                <p>Bloques diseñados para vender calma, cuidado y experiencia, no solo precio.</p>
              </article>
            </div>
          </section>
        `,
        css: `
          & .signature-services {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 2rem;
            padding: clamp(1.5rem, 3vw, 2.5rem);
            background: rgba(255,255,255,0.9);
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #7a685b;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            max-width: 18ch;
            font-size: clamp(1.9rem, 4vw, 3.2rem);
            line-height: 1.02;
            color: #1f2937;
          }
          & .signature-services__grid {
            display: grid;
            gap: 1rem;
            margin-top: 2rem;
          }
          @media (min-width: 900px) {
            & .signature-services__grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          & article {
            border-radius: 1.5rem;
            overflow: hidden;
            background: linear-gradient(180deg, #faf7f3, #f4ede6);
          }
          & article img {
            width: 100%;
            height: 13rem;
            object-fit: cover;
            display: block;
          }
          & article strong,
          & article p {
            display: block;
            padding-left: 1.4rem;
            padding-right: 1.4rem;
          }
          & strong {
            padding-top: 1.2rem;
            font-size: 1.1rem;
            color: #1f2937;
          }
          & p {
            margin: 0.8rem 0 0;
            font-size: 0.96rem;
            line-height: 1.85;
            color: #5b6574;
          }
        `,
      },
    },
    {
      tenantId: tenant.id,
      pageId: homePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'testimonial-editorial',
      position: 4,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="testimonial-editorial">
            <div class="testimonial-copy">
              <span class="eyebrow">Percepción</span>
              <h2>El sitio puede sentirse boutique, aspiracional y completamente propio para cada cliente.</h2>
            </div>
            <div class="testimonial-stack">
              <blockquote>
                <p>“Se siente elegante, claro y ordenado. Exactamente la experiencia que quiero transmitir.”</p>
                <footer>Cliente ideal de demo</footer>
              </blockquote>
              <blockquote>
                <p>“Esto ya no parece una web genérica, sino una propuesta de marca de verdad.”</p>
                <footer>Evaluación comercial</footer>
              </blockquote>
            </div>
          </section>
        `,
        css: `
          & .testimonial-editorial {
            display: grid;
            gap: 1.5rem;
            border-radius: 2rem;
            padding: clamp(1.5rem, 3vw, 2.5rem);
            background: #23201d;
            color: #f8f5f1;
            box-shadow: 0 24px 80px rgba(15, 23, 42, 0.16);
          }
          @media (min-width: 900px) {
            & .testimonial-editorial {
              grid-template-columns: 0.9fr 1.1fr;
              align-items: start;
            }
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.34em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.62);
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            font-size: clamp(2rem, 4vw, 3.2rem);
            line-height: 1.02;
            color: #ffffff;
          }
          & .testimonial-stack {
            display: grid;
            gap: 1rem;
          }
          & blockquote {
            margin: 0;
            border-radius: 1.5rem;
            padding: 1.4rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
          }
          & p {
            margin: 0;
            font-size: 1rem;
            line-height: 1.9;
          }
          & footer {
            margin-top: 0.9rem;
            font-size: 0.72rem;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.52);
          }
        `,
      },
    },
    {
      tenantId: tenant.id,
      pageId: homePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'contact-cta-editorial',
      position: 5,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="contact-cta">
            <div class="contact-cta__copy">
              <div>
                <span class="eyebrow">Conversión suave</span>
                <h2>Y cuando quieras, cada bloque puede empujar a la acción con mucha más personalidad.</h2>
              </div>
              <div class="contact-cta__actions">
                <a href="/contacto" class="primary-link">Ir a contacto</a>
                <a href="/servicios" class="secondary-link">Explorar el catálogo</a>
              </div>
            </div>
            <div class="contact-cta__visual">
              <img src="{{asset:contact-ambient}}" alt="Ambiente del estudio" />
            </div>
          </section>
        `,
        css: `
          & .contact-cta {
            display: grid;
            gap: 1.4rem;
            border: 1px solid rgba(15,23,42,0.08);
            border-radius: 2rem;
            padding: clamp(1.5rem, 3vw, 2.3rem);
            background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,239,233,0.86));
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
          }
          @media (min-width: 900px) {
            & .contact-cta {
              grid-template-columns: 1fr 22rem;
              align-items: center;
            }
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #7a685b;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            max-width: 18ch;
            font-size: clamp(1.9rem, 4vw, 3rem);
            line-height: 1.02;
            color: #1f2937;
          }
          & .contact-cta__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.85rem;
            margin-top: 1.5rem;
          }
          & .contact-cta__visual {
            overflow: hidden;
            border-radius: 1.6rem;
            min-height: 18rem;
            background: #efe6de;
          }
          & .contact-cta__visual img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
          }
          & .primary-link,
          & .secondary-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 3rem;
            padding: 0 1.35rem;
            border-radius: 999px;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
          }
          & .primary-link {
            background: #1f2937;
            color: #ffffff;
          }
          & .secondary-link {
            border: 1px solid rgba(15,23,42,0.12);
            background: rgba(255,255,255,0.74);
            color: #334155;
          }
        `,
      },
    },
    {
      tenantId: tenant.id,
      pageId: servicesPage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'service-editorial-note',
      position: 1,
      isVisible: true,
      settings: {},
      content: {
        html: `
          <div class="service-editorial">
            <div class="service-editorial__lead">
              <span class="eyebrow">Rituales</span>
              <h2>Tratamientos pensados para verse bien y sentirse mejor.</h2>
            </div>
            <div class="service-editorial__copy">
              <p>Cada servicio puede presentarse con una narrativa más aspiracional, destacando técnica, calma, detalle y el estilo distintivo del estudio.</p>
            </div>
          </div>
        `,
        css: `
          & .service-editorial {
            display: grid;
            gap: 1.5rem;
            padding: 0.5rem 0;
          }
          @media (min-width: 900px) {
            & .service-editorial {
              grid-template-columns: 1fr 1fr;
            }
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.7rem;
            letter-spacing: 0.38em;
            text-transform: uppercase;
            color: #7a685b;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            font-size: clamp(1.9rem, 4vw, 3rem);
            line-height: 1.02;
            color: #1f2937;
          }
          & p {
            margin: 0;
            font-size: 1rem;
            line-height: 1.9;
            color: #5b6574;
          }
        `,
      },
    },
    {
      tenantId: tenant.id,
      pageId: contactPage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'contact-editorial-note',
      position: 1,
      isVisible: true,
      settings: {},
      content: {
        html: `
          <div class="contact-note">
            <span class="eyebrow">Atención</span>
            <h2>Una experiencia cálida empieza desde el primer mensaje.</h2>
            <p>Este bloque muestra cómo un tenant puede agregar contenido completamente personalizado para reforzar su tono de marca y diferenciar su sitio sin depender de desarrollos manuales.</p>
          </div>
        `,
        css: `
          & .contact-note {
            padding: 0.5rem 0;
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.7rem;
            letter-spacing: 0.38em;
            text-transform: uppercase;
            color: #7a685b;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0 0 1rem;
            font-size: clamp(1.8rem, 4vw, 2.8rem);
            line-height: 1.02;
            color: #1f2937;
          }
          & p {
            margin: 0;
            max-width: 58ch;
            font-size: 1rem;
            line-height: 1.9;
            color: #5b6574;
          }
        `,
      },
    },
  ]);

  await serviceRepository.save([
    {
      tenantId: tenant.id,
      name: 'Manicure premium',
      description: 'Limpieza, forma, cutícula y esmaltado semipermanente.',
      durationMinutes: 60,
      price: 22,
      isActive: true,
      category: 'manicure',
      color: '#C16A7B',
    },
    {
      tenantId: tenant.id,
      name: 'Pedicure spa',
      description: 'Exfoliación, hidratación profunda y esmaltado.',
      durationMinutes: 75,
      price: 28,
      isActive: true,
      category: 'pedicure',
      color: '#7C3A46',
    },
    {
      tenantId: tenant.id,
      name: 'Soft gel extensions',
      description: 'Aplicación completa con acabado natural y elegante.',
      durationMinutes: 90,
      price: 40,
      isActive: true,
      category: 'extensions',
      color: '#A54E61',
    },
  ]);

  const healthPrimeTenant = await tenantRepository.save({
    id: healthPrimeTenantId,
    name: 'Health Prime Studio',
    slug: 'healthprimeclinic',
    status: 'active',
    plan: 'premium',
  });

  let healthPrimeAdminRole = await roleRepository.findOne({
    where: { tenantId: healthPrimeTenant.id, code: DEFAULT_TENANT_ROLE_DEFINITIONS[0].code },
  });
  if (!healthPrimeAdminRole) {
    healthPrimeAdminRole = await roleRepository.save({
      tenantId: healthPrimeTenant.id,
      code: DEFAULT_TENANT_ROLE_DEFINITIONS[0].code,
      name: DEFAULT_TENANT_ROLE_DEFINITIONS[0].name,
      description: DEFAULT_TENANT_ROLE_DEFINITIONS[0].description,
      isSystem: true,
      isActive: true,
      permissions: [...DEFAULT_TENANT_ROLE_DEFINITIONS[0].permissions],
    });
  }

  await domainRepository.save([
    {
      tenantId: healthPrimeTenant.id,
      domain: 'healthprime.quicklyecsites.local',
      type: 'subdomain',
      isPrimary: true,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      sslStatus: 'active',
    },
    {
      tenantId: healthPrimeTenant.id,
      domain: 'www.healthprimeclinic.com',
      type: 'custom',
      isPrimary: false,
      verificationStatus: 'pending',
      verifiedAt: null,
      sslStatus: 'pending',
    },
  ]);

  await settingsRepository.save({
    tenantId: healthPrimeTenant.id,
    publicSiteEnabled: true,
    bookingEnabled: true,
    timezone: 'America/Guayaquil',
    locale: 'es-EC',
    currency: 'USD',
    contactEmail: 'hola@healthprimeclinic.com',
    contactPhone: '+593 99 765 4321',
    whatsappNumber: '+593 99 765 4321',
    siteIndexingEnabled: true,
    defaultSeoTitle: 'Health Prime Studio | Atención profesional y reservas online',
    defaultSeoDescription: 'Demo premium para clínicas, odontología, veterinaria y servicios especializados con reservas online.',
    defaultOgImageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118',
    canonicalDomain: 'healthprime.quicklyecsites.local',
  });

  await brandingRepository.save({
    tenantId: healthPrimeTenant.id,
    logoUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef',
    faviconUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef',
    primaryColor: '#0F3B57',
    secondaryColor: '#F5F8FA',
    accentColor: '#6BAA9B',
    fontFamily: 'Manrope',
    borderRadius: '1.5rem',
    buttonStyle: 'pill',
    customCss: null,
  });

  const healthPrimeHomePage = await pageRepository.save({
    tenantId: healthPrimeTenant.id,
    templateId: template.id,
    slug: 'home',
    title: 'Health Prime Studio',
    isHome: true,
    isPublished: true,
    isIndexable: true,
    seoTitle: 'Health Prime Studio | Sitio premium para servicios de salud',
    seoDescription: 'Template demo premium para clínicas, odontología, veterinaria y consultorios modernos.',
    canonicalUrl: 'https://healthprime.quicklyecsites.local',
    ogTitle: 'Health Prime Studio',
    ogDescription: 'Diseño elegante, confiable y altamente personalizable para servicios de salud con reservas online.',
    ogImageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118',
    metaRobots: 'index,follow',
  });

  const [healthPrimeServicesPage, healthPrimeContactPage] = await pageRepository.save([
    {
      tenantId: healthPrimeTenant.id,
      templateId: template.id,
      slug: 'servicios',
      title: 'Servicios',
      isHome: false,
      isPublished: true,
      isIndexable: true,
      seoTitle: 'Servicios | Health Prime Studio',
      seoDescription: 'Servicios destacados y líneas de atención de Health Prime Studio.',
      canonicalUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogImageUrl: null,
      metaRobots: 'index,follow',
    },
    {
      tenantId: healthPrimeTenant.id,
      templateId: template.id,
      slug: 'contacto',
      title: 'Contacto',
      isHome: false,
      isPublished: true,
      isIndexable: true,
      seoTitle: 'Contacto | Health Prime Studio',
      seoDescription: 'Información de contacto y atención de Health Prime Studio.',
      canonicalUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogImageUrl: null,
      metaRobots: 'index,follow',
    },
  ]);

  await sectionRepository.save([
    {
      tenantId: healthPrimeTenant.id,
      pageId: null,
      scope: 'global',
      type: 'header',
      variant: 'default',
      position: 1,
      isVisible: true,
      settings: {},
      content: {
        kicker: 'Health Care Demo',
        title: 'Health Prime Studio',
        subtitle: 'Una presencia digital premium para clínicas, odontología, veterinaria y servicios especializados.',
        ctaLabel: 'Reservar cita',
        ctaUrl: '/reservar',
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: null,
      scope: 'global',
      type: 'footer',
      variant: 'default',
      position: 2,
      isVisible: true,
      settings: {},
      content: {
        text: 'Comunica confianza, claridad y cuidado con un diseño editorial listo para adaptarse a distintos giros de salud.',
        address: 'Kennedy Norte, Guayaquil, Ecuador',
        hours: 'Lunes a sábado · 08:00 a 18:00',
        instagram: '@healthprimestudio',
        footerWhatsapp: '+593 99 765 4321',
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeHomePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'hero-medical-editorial',
      position: 1,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="medical-hero">
            <div class="medical-hero__copy">
              <span class="eyebrow">Health Prime</span>
              <h1>Una experiencia digital confiable, luminosa y altamente adaptable para servicios de salud.</h1>
              <p>Este demo muestra cómo Quickly Sites puede vestir una clínica, un consultorio, un centro odontológico o una veterinaria con una narrativa premium, clara y lista para transmitir profesionalismo desde el primer segundo.</p>
              <div class="medical-hero__actions">
                <a href="/servicios" class="primary-link">Ver servicios</a>
                <a href="/contacto" class="secondary-link">Solicitar atención</a>
              </div>
            </div>
            <div class="medical-hero__visual">
              <div class="medical-hero__shot">
                <img src="{{asset:hero-main}}" alt="Atención clínica premium" />
              </div>
              <article class="medical-summary">
                <span class="eyebrow">Percepción</span>
                <strong>Confianza + claridad</strong>
                <p>La combinación ideal para salud, odontología, veterinaria y servicios especializados.</p>
              </article>
            </div>
          </section>
        `,
        css: `
          & .medical-hero {
            display: grid;
            gap: 1.5rem;
            align-items: stretch;
          }
          @media (min-width: 980px) {
            & .medical-hero {
              grid-template-columns: 1.05fr 0.95fr;
            }
          }
          & .medical-hero__copy,
          & .medical-hero__shot,
          & .medical-summary {
            border: 1px solid rgba(15, 59, 87, 0.08);
            border-radius: 2rem;
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,248,250,0.92));
            box-shadow: 0 24px 80px rgba(15, 59, 87, 0.08);
          }
          & .medical-hero__copy {
            padding: clamp(2rem, 4vw, 4rem);
          }
          & .eyebrow {
            display: inline-block;
            margin-bottom: 1rem;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.34em;
            color: #5f8e88;
          }
          & h1 {
            margin: 0;
            font-size: clamp(2.4rem, 5vw, 4.9rem);
            line-height: 0.96;
            color: #0f2d3f;
          }
          & p {
            margin: 1.4rem 0 0;
            max-width: 62ch;
            font-size: 1.02rem;
            line-height: 1.9;
            color: #546371;
          }
          & .medical-hero__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.85rem;
            margin-top: 2rem;
          }
          & .primary-link,
          & .secondary-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 3rem;
            padding: 0 1.35rem;
            border-radius: 999px;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
          }
          & .primary-link {
            background: #0f3b57;
            color: #ffffff;
          }
          & .secondary-link {
            border: 1px solid rgba(15,59,87,0.12);
            background: rgba(255,255,255,0.76);
            color: #1f3c4d;
          }
          & .medical-hero__visual {
            display: grid;
            gap: 1.5rem;
          }
          & .medical-hero__shot {
            overflow: hidden;
            min-height: 34rem;
            background: #edf4f6;
          }
          & .medical-hero__shot img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          & .medical-summary {
            padding: 1.7rem;
          }
          & .medical-summary strong {
            display: block;
            font-size: 1.9rem;
            line-height: 1;
            color: #0f2d3f;
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeHomePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'trust-metrics',
      position: 2,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="trust-metrics">
            <article><strong>+12 años</strong><span>de experiencia clínica comunicada con claridad</span></article>
            <article><strong>3 giros</strong><span>médico, odontología y veterinaria con la misma base visual</span></article>
            <article><strong>100% adaptable</strong><span>bloques custom para construir una web realmente propia</span></article>
          </section>
        `,
        css: `
          & .trust-metrics {
            display: grid;
            gap: 1rem;
          }
          @media (min-width: 860px) {
            & .trust-metrics {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          & article {
            border: 1px solid rgba(15, 59, 87, 0.08);
            border-radius: 1.75rem;
            padding: 1.5rem;
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(242,248,247,0.88));
            box-shadow: 0 18px 50px rgba(15, 59, 87, 0.06);
          }
          & strong {
            display: block;
            font-size: clamp(1.8rem, 4vw, 2.8rem);
            line-height: 1;
            color: #0f3b57;
          }
          & span {
            display: block;
            margin-top: 0.7rem;
            font-size: 0.96rem;
            line-height: 1.8;
            color: #5b6978;
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeHomePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'services-clinical-grid',
      position: 3,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="clinical-services">
            <header>
              <span class="eyebrow">Líneas de atención</span>
              <h2>El mismo sistema puede presentar distintas especialidades con una estética seria y memorable.</h2>
            </header>
            <div class="clinical-services__grid">
              <article>
                <img src="{{asset:service-general-care}}" alt="Atención general" />
                <strong>Atención general</strong>
                <p>Ideal para medicina familiar, evaluación primaria o control preventivo.</p>
              </article>
              <article>
                <img src="{{asset:service-specialty-care}}" alt="Especialidades" />
                <strong>Especialidades</strong>
                <p>Un bloque pensado para odontología, procedimientos clínicos o áreas diferenciales.</p>
              </article>
              <article>
                <img src="{{asset:service-preventive-care}}" alt="Prevención y seguimiento" />
                <strong>Prevención y seguimiento</strong>
                <p>Perfecto para vacunación, revisiones, planes de cuidado o control postconsulta.</p>
              </article>
            </div>
          </section>
        `,
        css: `
          & .clinical-services {
            border: 1px solid rgba(15, 59, 87, 0.08);
            border-radius: 2rem;
            padding: clamp(1.5rem, 3vw, 2.5rem);
            background: rgba(255,255,255,0.92);
            box-shadow: 0 18px 50px rgba(15, 59, 87, 0.06);
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #5f8e88;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            max-width: 18ch;
            font-size: clamp(1.9rem, 4vw, 3.1rem);
            line-height: 1.02;
            color: #0f2d3f;
          }
          & .clinical-services__grid {
            display: grid;
            gap: 1rem;
            margin-top: 2rem;
          }
          @media (min-width: 900px) {
            & .clinical-services__grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          & article {
            border-radius: 1.5rem;
            overflow: hidden;
            background: linear-gradient(180deg, #f9fbfc, #edf4f6);
          }
          & article img {
            width: 100%;
            height: 13rem;
            object-fit: cover;
            display: block;
          }
          & article strong,
          & article p {
            display: block;
            padding-left: 1.4rem;
            padding-right: 1.4rem;
          }
          & strong {
            padding-top: 1.2rem;
            font-size: 1.08rem;
            color: #0f2d3f;
          }
          & p {
            margin: 0.8rem 0 0;
            font-size: 0.96rem;
            line-height: 1.85;
            color: #5b6978;
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeHomePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'why-choose-us',
      position: 4,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="why-choose">
            <article class="why-choose__copy">
              <span class="eyebrow">Confianza</span>
              <h2>Una web de salud debe verse humana, organizada y técnicamente sólida al mismo tiempo.</h2>
              <p>Este bloque demuestra cómo puedes vender experiencia, cercanía, procesos claros y calidad de atención sin caer en un diseño frío o genérico.</p>
            </article>
            <article class="why-choose__visual">
              <img src="{{asset:team-ambient}}" alt="Equipo de salud" />
            </article>
          </section>
        `,
        css: `
          & .why-choose {
            display: grid;
            gap: 1.5rem;
          }
          @media (min-width: 920px) {
            & .why-choose {
              grid-template-columns: 1.1fr 0.9fr;
              align-items: stretch;
            }
          }
          & .why-choose__copy,
          & .why-choose__visual {
            border: 1px solid rgba(15, 59, 87, 0.08);
            border-radius: 2rem;
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,248,250,0.92));
            box-shadow: 0 18px 50px rgba(15, 59, 87, 0.06);
          }
          & .why-choose__copy {
            padding: 2rem;
          }
          & .why-choose__visual {
            overflow: hidden;
            min-height: 22rem;
          }
          & .why-choose__visual img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #5f8e88;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0 0 1rem;
            font-size: clamp(1.9rem, 4vw, 3.2rem);
            line-height: 1.02;
            color: #0f2d3f;
          }
          & p {
            margin: 0;
            font-size: 1rem;
            line-height: 1.92;
            color: #5b6978;
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeHomePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'specialists-showcase',
      position: 5,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="specialists-showcase">
            <header>
              <span class="eyebrow">Equipo</span>
              <h2>Presenta profesionales y áreas de atención sin rehacer toda la web para cada giro.</h2>
            </header>
            <div class="specialists-showcase__grid">
              <article>
                <img src="{{asset:specialist-one}}" alt="Especialista uno" />
                <strong>Dirección clínica</strong>
                <p>Perfil adaptable a medicina general, odontología o coordinación veterinaria.</p>
              </article>
              <article>
                <img src="{{asset:specialist-two}}" alt="Especialista dos" />
                <strong>Especialidades</strong>
                <p>Ideal para ortodoncia, dermatología, cirugía menor o medicina preventiva.</p>
              </article>
              <article>
                <img src="{{asset:specialist-three}}" alt="Especialista tres" />
                <strong>Atención humana</strong>
                <p>Bloque perfecto para transmitir calidez y credibilidad en negocios de salud.</p>
              </article>
            </div>
          </section>
        `,
        css: `
          & .specialists-showcase {
            display: grid;
            gap: 1.4rem;
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #5f8e88;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            max-width: 18ch;
            font-size: clamp(1.9rem, 4vw, 3rem);
            line-height: 1.02;
            color: #0f2d3f;
          }
          & .specialists-showcase__grid {
            display: grid;
            gap: 1rem;
          }
          @media (min-width: 920px) {
            & .specialists-showcase__grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          & article {
            border: 1px solid rgba(15, 59, 87, 0.08);
            border-radius: 1.6rem;
            overflow: hidden;
            background: rgba(255,255,255,0.94);
            box-shadow: 0 18px 50px rgba(15, 59, 87, 0.05);
          }
          & article img {
            width: 100%;
            height: 15rem;
            object-fit: cover;
            display: block;
          }
          & article strong,
          & article p {
            display: block;
            padding-left: 1.35rem;
            padding-right: 1.35rem;
          }
          & article strong {
            padding-top: 1.1rem;
            font-size: 1.06rem;
            color: #0f2d3f;
          }
          & article p {
            margin: 0.8rem 0 0;
            font-size: 0.95rem;
            line-height: 1.8;
            color: #5b6978;
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeHomePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'testimonials-medical',
      position: 6,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="testimonials-medical">
            <div class="testimonials-medical__copy">
              <span class="eyebrow">Reputación</span>
              <h2>La confianza también se diseña.</h2>
            </div>
            <div class="testimonials-medical__stack">
              <blockquote>
                <p>“El sitio transmite orden, profesionalismo y una sensación inmediata de confianza.”</p>
                <footer>Cliente ideal de clínica</footer>
              </blockquote>
              <blockquote>
                <p>“Se siente moderno, premium y adaptable sin perder el tono humano que necesitamos en salud.”</p>
                <footer>Demo comercial</footer>
              </blockquote>
            </div>
          </section>
        `,
        css: `
          & .testimonials-medical {
            display: grid;
            gap: 1.4rem;
            border-radius: 2rem;
            padding: clamp(1.5rem, 3vw, 2.4rem);
            background: #0f2d3f;
            color: #f8fbfc;
            box-shadow: 0 24px 80px rgba(15, 59, 87, 0.18);
          }
          @media (min-width: 900px) {
            & .testimonials-medical {
              grid-template-columns: 0.9fr 1.1fr;
            }
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.34em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.6);
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            font-size: clamp(2rem, 4vw, 3.1rem);
            line-height: 1.02;
            color: #ffffff;
          }
          & .testimonials-medical__stack {
            display: grid;
            gap: 1rem;
          }
          & blockquote {
            margin: 0;
            border-radius: 1.5rem;
            padding: 1.4rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
          }
          & p {
            margin: 0;
            font-size: 1rem;
            line-height: 1.9;
          }
          & footer {
            margin-top: 0.9rem;
            font-size: 0.72rem;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.52);
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeHomePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'insurance-or-process',
      position: 7,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="care-process">
            <article>
              <span class="step">01</span>
              <strong>Consulta inicial</strong>
              <p>Explica con claridad cómo empieza el proceso de atención.</p>
            </article>
            <article>
              <span class="step">02</span>
              <strong>Evaluación y plan</strong>
              <p>Ideal para procedimientos, seguimiento clínico o revisiones preventivas.</p>
            </article>
            <article>
              <span class="step">03</span>
              <strong>Seguimiento</strong>
              <p>Comunica profesionalismo, continuidad y una operación bien organizada.</p>
            </article>
          </section>
        `,
        css: `
          & .care-process {
            display: grid;
            gap: 1rem;
          }
          @media (min-width: 860px) {
            & .care-process {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          & article {
            border: 1px solid rgba(15, 59, 87, 0.08);
            border-radius: 1.7rem;
            padding: 1.5rem;
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(242,248,247,0.88));
            box-shadow: 0 18px 50px rgba(15, 59, 87, 0.06);
          }
          & .step {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 3rem;
            height: 3rem;
            border-radius: 999px;
            background: rgba(107,170,155,0.14);
            color: #0f3b57;
            font-size: 0.92rem;
            font-weight: 700;
            letter-spacing: 0.1em;
          }
          & strong {
            display: block;
            margin-top: 1rem;
            font-size: 1.08rem;
            color: #0f2d3f;
          }
          & p {
            margin: 0.8rem 0 0;
            font-size: 0.96rem;
            line-height: 1.8;
            color: #5b6978;
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeHomePage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'contact-cta-clinic',
      position: 8,
      isVisible: true,
      settings: { surface: 'raw' },
      content: {
        html: `
          <section class="contact-cta-clinic">
            <div class="contact-cta-clinic__copy">
              <div>
                <span class="eyebrow">Conversión</span>
                <h2>Convierte este demo en clínica, odontología o veterinaria cambiando solo contenido, imágenes y tono.</h2>
              </div>
              <div class="contact-cta-clinic__actions">
                <a href="/reservar" class="primary-link">Reservar cita</a>
                <a href="/servicios" class="secondary-link">Explorar servicios</a>
              </div>
            </div>
            <div class="contact-cta-clinic__visual">
              <img src="{{asset:contact-ambient}}" alt="Recepción clínica moderna" />
            </div>
          </section>
        `,
        css: `
          & .contact-cta-clinic {
            display: grid;
            gap: 1.4rem;
            border: 1px solid rgba(15,59,87,0.08);
            border-radius: 2rem;
            padding: clamp(1.5rem, 3vw, 2.3rem);
            background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(241,248,247,0.9));
            box-shadow: 0 18px 50px rgba(15, 59, 87, 0.06);
          }
          @media (min-width: 900px) {
            & .contact-cta-clinic {
              grid-template-columns: 1fr 22rem;
              align-items: center;
            }
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.72rem;
            letter-spacing: 0.35em;
            text-transform: uppercase;
            color: #5f8e88;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            max-width: 18ch;
            font-size: clamp(1.9rem, 4vw, 3rem);
            line-height: 1.02;
            color: #0f2d3f;
          }
          & .contact-cta-clinic__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.85rem;
            margin-top: 1.5rem;
          }
          & .contact-cta-clinic__visual {
            overflow: hidden;
            border-radius: 1.6rem;
            min-height: 18rem;
            background: #edf4f6;
          }
          & .contact-cta-clinic__visual img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
          }
          & .primary-link,
          & .secondary-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 3rem;
            padding: 0 1.35rem;
            border-radius: 999px;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 600;
          }
          & .primary-link {
            background: #0f3b57;
            color: #ffffff;
          }
          & .secondary-link {
            border: 1px solid rgba(15,59,87,0.12);
            background: rgba(255,255,255,0.76);
            color: #1f3c4d;
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeServicesPage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'services-note-medical',
      position: 1,
      isVisible: true,
      settings: {},
      content: {
        html: `
          <div class="services-note-medical">
            <div class="services-note-medical__lead">
              <span class="eyebrow">Servicios</span>
              <h2>Desde atención general hasta especialidades, el contenido puede adaptarse sin rediseñar todo el sitio.</h2>
            </div>
            <div class="services-note-medical__copy">
              <p>Este demo está pensado para vender claridad, experiencia y orden operativo. La misma estructura puede hablar de medicina, odontología o veterinaria solo cambiando bloques, imágenes y copy.</p>
            </div>
          </div>
        `,
        css: `
          & .services-note-medical {
            display: grid;
            gap: 1.5rem;
            padding: 0.5rem 0;
          }
          @media (min-width: 900px) {
            & .services-note-medical {
              grid-template-columns: 1fr 1fr;
            }
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.7rem;
            letter-spacing: 0.38em;
            text-transform: uppercase;
            color: #5f8e88;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0;
            font-size: clamp(1.9rem, 4vw, 3rem);
            line-height: 1.02;
            color: #0f2d3f;
          }
          & p {
            margin: 0;
            font-size: 1rem;
            line-height: 1.9;
            color: #5b6978;
          }
        `,
      },
    },
    {
      tenantId: healthPrimeTenant.id,
      pageId: healthPrimeContactPage.id,
      scope: 'page',
      type: 'custom_html',
      variant: 'contact-note-clinic',
      position: 1,
      isVisible: true,
      settings: {},
      content: {
        html: `
          <div class="contact-note-clinic">
            <span class="eyebrow">Atención</span>
            <h2>Un contacto claro también comunica profesionalismo y confianza.</h2>
            <p>Usa este bloque para reforzar tu propuesta de atención, horarios, cobertura, especialidades o cualquier mensaje estratégico que deba verse antes del formulario.</p>
          </div>
        `,
        css: `
          & .contact-note-clinic {
            padding: 0.5rem 0;
          }
          & .eyebrow {
            display: inline-block;
            font-size: 0.7rem;
            letter-spacing: 0.38em;
            text-transform: uppercase;
            color: #5f8e88;
            margin-bottom: 1rem;
          }
          & h2 {
            margin: 0 0 1rem;
            font-size: clamp(1.8rem, 4vw, 2.8rem);
            line-height: 1.02;
            color: #0f2d3f;
          }
          & p {
            margin: 0;
            max-width: 58ch;
            font-size: 1rem;
            line-height: 1.9;
            color: #5b6978;
          }
        `,
      },
    },
  ]);

  const [healthPrimeGeneralService, healthPrimeSpecialtyService, healthPrimePreventiveService] = await serviceRepository.save([
    {
      tenantId: healthPrimeTenant.id,
      name: 'Consulta general',
      description: 'Evaluación inicial, orientación clínica y control preventivo.',
      durationMinutes: 45,
      price: 35,
      isActive: true,
      category: 'general',
      color: '#0F3B57',
    },
    {
      tenantId: healthPrimeTenant.id,
      name: 'Atención especializada',
      description: 'Ideal para odontología, procedimientos o especialidades clínicas.',
      durationMinutes: 60,
      price: 55,
      isActive: true,
      category: 'specialty',
      color: '#2E6F88',
    },
    {
      tenantId: healthPrimeTenant.id,
      name: 'Plan preventivo',
      description: 'Seguimiento, revisiones periódicas y continuidad del cuidado.',
      durationMinutes: 30,
      price: 28,
      isActive: true,
      category: 'preventive',
      color: '#6BAA9B',
    },
  ]);

  const [healthPrimeDoctor, healthPrimeSpecialist] = await staffRepository.save([
    {
      tenantId: healthPrimeTenant.id,
      name: 'Dra. Valeria Torres',
      bio: 'Dirección clínica y atención integral. Perfil adaptable a medicina general, odontología o coordinación veterinaria.',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
      email: 'valeria@healthprimeclinic.com',
      phone: '+593 99 765 4321',
      isBookable: true,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      name: 'Dr. Mateo Rivera',
      bio: 'Especialidades, procedimientos y seguimiento clínico con enfoque humano y tecnología.',
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=80',
      email: 'mateo@healthprimeclinic.com',
      phone: '+593 99 765 4322',
      isBookable: true,
      isActive: true,
    },
  ]);

  await staffServiceRepository.save([
    {
      staffId: healthPrimeDoctor.id,
      serviceId: healthPrimeGeneralService.id,
    },
    {
      staffId: healthPrimeDoctor.id,
      serviceId: healthPrimePreventiveService.id,
    },
    {
      staffId: healthPrimeSpecialist.id,
      serviceId: healthPrimeSpecialtyService.id,
    },
    {
      staffId: healthPrimeSpecialist.id,
      serviceId: healthPrimePreventiveService.id,
    },
  ]);

  await availabilityRuleRepository.save([
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeDoctor.id,
      dayOfWeek: 0,
      startTime: '08:00',
      endTime: '14:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeDoctor.id,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '14:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeDoctor.id,
      dayOfWeek: 2,
      startTime: '08:00',
      endTime: '14:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeDoctor.id,
      dayOfWeek: 3,
      startTime: '08:00',
      endTime: '14:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeDoctor.id,
      dayOfWeek: 4,
      startTime: '08:00',
      endTime: '14:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeDoctor.id,
      dayOfWeek: 5,
      startTime: '08:00',
      endTime: '14:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeDoctor.id,
      dayOfWeek: 6,
      startTime: '08:00',
      endTime: '14:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeSpecialist.id,
      dayOfWeek: 0,
      startTime: '11:00',
      endTime: '18:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeSpecialist.id,
      dayOfWeek: 1,
      startTime: '11:00',
      endTime: '18:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeSpecialist.id,
      dayOfWeek: 2,
      startTime: '11:00',
      endTime: '18:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeSpecialist.id,
      dayOfWeek: 3,
      startTime: '11:00',
      endTime: '18:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeSpecialist.id,
      dayOfWeek: 4,
      startTime: '11:00',
      endTime: '18:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeSpecialist.id,
      dayOfWeek: 5,
      startTime: '11:00',
      endTime: '18:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
    {
      tenantId: healthPrimeTenant.id,
      staffId: healthPrimeSpecialist.id,
      dayOfWeek: 6,
      startTime: '11:00',
      endTime: '18:00',
      slotIntervalMinutes: 30,
      isActive: true,
    },
  ]);

  await scheduleBlockRepository.save({
    tenantId: healthPrimeTenant.id,
    staffId: healthPrimeSpecialist.id,
    startDateTime: new Date('2026-05-14T12:00:00-05:00'),
    endDateTime: new Date('2026-05-14T13:30:00-05:00'),
    reason: 'Bloqueo demo por procedimiento interno',
    blockType: 'manual',
  });

  const [healthPrimeCustomerOne, healthPrimeCustomerTwo] = await customerRepository.save([
    {
      tenantId: healthPrimeTenant.id,
      fullName: 'Daniela Paredes',
      email: 'daniela.paredes@example.com',
      phone: '+593 98 222 1111',
      identification: '0923456789',
      notes: 'Cliente demo para mostrar seguimiento y gestión de reservas.',
      tags: { segment: 'premium', source: 'demo' },
    },
    {
      tenantId: healthPrimeTenant.id,
      fullName: 'Carlos Méndez',
      email: 'carlos.mendez@example.com',
      phone: '+593 98 333 2222',
      identification: '0912345678',
      notes: 'Cliente demo de control preventivo.',
      tags: { segment: 'preventive', source: 'demo' },
    },
  ]);

  await appointmentRepository.save([
    {
      tenantId: healthPrimeTenant.id,
      customerId: healthPrimeCustomerOne.id,
      serviceId: healthPrimeSpecialtyService.id,
      staffId: healthPrimeSpecialist.id,
      source: 'admin_panel',
      status: 'confirmed',
      startDateTime: new Date('2026-05-12T10:00:00-05:00'),
      endDateTime: new Date('2026-05-12T11:00:00-05:00'),
      notes: 'Reserva demo confirmada para mostrar agenda operativa.',
      internalNotes: 'Cliente interesada en tratamiento recurrente.',
      reminderScheduledAt: new Date('2026-05-11T10:00:00-05:00'),
      reminderSentAt: null,
      reminderError: null,
    },
    {
      tenantId: healthPrimeTenant.id,
      customerId: healthPrimeCustomerTwo.id,
      serviceId: healthPrimePreventiveService.id,
      staffId: healthPrimeDoctor.id,
      source: 'public_site',
      status: 'pending',
      startDateTime: new Date('2026-05-14T09:30:00-05:00'),
      endDateTime: new Date('2026-05-14T10:00:00-05:00'),
      notes: 'Solicitud demo generada desde el sitio público.',
      internalNotes: 'Mostrar flujo de aprobación y recordatorio premium.',
      reminderScheduledAt: new Date('2026-05-13T09:30:00-05:00'),
      reminderSentAt: null,
      reminderError: null,
    },
  ]);

  const adminEmail = 'admin@quicklyecsites.local';
  let adminUser = await userRepository.findOne({ where: { email: adminEmail } });
  if (!adminUser) {
    adminUser = await userRepository.save({
      fullName: 'Quickly Sites Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin123*', 10),
      isActive: true,
    });
  }

  const healthPrimeAdminEmail = 'admin@healthprimeclinic.com';
  let healthPrimeAdminUser = await userRepository.findOne({ where: { email: healthPrimeAdminEmail } });
  if (!healthPrimeAdminUser) {
    healthPrimeAdminUser = await userRepository.save({
      fullName: 'Health Prime Tenant Admin',
      email: healthPrimeAdminEmail,
      passwordHash: await bcrypt.hash('HealthPrime123*', 10),
      isActive: true,
    });
  } else {
    healthPrimeAdminUser.isActive = true;
    healthPrimeAdminUser.passwordHash = await bcrypt.hash('HealthPrime123*', 10);
    await userRepository.save(healthPrimeAdminUser);
  }

  const existingMembership = await membershipRepository.findOne({
    where: { userId: adminUser.id, tenantId: tenant.id },
  });

  if (!existingMembership) {
    await membershipRepository.save({
      userId: adminUser.id,
      tenantId: tenant.id,
      roleId: adminRole.id,
      role: adminRole.code,
      isActive: true,
      allowedModules: null,
      permissions: null,
    });
  }

  const existingHealthPrimeMembership = await membershipRepository.findOne({
    where: { userId: adminUser.id, tenantId: healthPrimeTenant.id },
  });

  if (!existingHealthPrimeMembership) {
    await membershipRepository.save({
      userId: adminUser.id,
      tenantId: healthPrimeTenant.id,
      roleId: healthPrimeAdminRole.id,
      role: healthPrimeAdminRole.code,
      isActive: true,
      allowedModules: null,
      permissions: null,
    });
  }

  const existingHealthPrimeAdminMembership = await membershipRepository.findOne({
    where: { userId: healthPrimeAdminUser.id, tenantId: healthPrimeTenant.id },
  });

  if (!existingHealthPrimeAdminMembership) {
    await membershipRepository.save({
      userId: healthPrimeAdminUser.id,
      tenantId: healthPrimeTenant.id,
      roleId: healthPrimeAdminRole.id,
      role: healthPrimeAdminRole.code,
      isActive: true,
      allowedModules: null,
      permissions: null,
    });
  }

  const platformEmail = 'sites@quicklyec.com';
  let platformUser = await userRepository.findOne({ where: { email: platformEmail } });
  if (!platformUser) {
    platformUser = await userRepository.save({
      fullName: 'Quickly Sites Platform Admin',
      email: platformEmail,
      passwordHash: await bcrypt.hash('Andres05!', 10),
      isActive: true,
      isPlatformAdmin: true,
      platformRole: 'super_admin',
    });
  } else {
    platformUser.isPlatformAdmin = true;
    platformUser.platformRole = 'super_admin';
    platformUser.isActive = true;
    platformUser.passwordHash = await bcrypt.hash('Andres05!', 10);
    await userRepository.save(platformUser);
  }

  const platformMembership = await membershipRepository.findOne({
    where: { userId: platformUser.id, tenantId: tenant.id },
  });

  if (!platformMembership) {
    await membershipRepository.save({
      userId: platformUser.id,
      tenantId: tenant.id,
      roleId: adminRole.id,
      role: adminRole.code,
      isActive: true,
      allowedModules: null,
      permissions: null,
    });
  }

  const platformHealthPrimeMembership = await membershipRepository.findOne({
    where: { userId: platformUser.id, tenantId: healthPrimeTenant.id },
  });

  if (!platformHealthPrimeMembership) {
    await membershipRepository.save({
      userId: platformUser.id,
      tenantId: healthPrimeTenant.id,
      roleId: healthPrimeAdminRole.id,
      role: healthPrimeAdminRole.code,
      isActive: true,
      allowedModules: null,
      permissions: null,
    });
  }

  await dataSource.destroy();
  process.stdout.write('Seed completed\n');
}

main().catch(async (error) => {
  process.stderr.write(`${String(error)}\n`);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
