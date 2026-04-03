import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import dataSource from 'src/common/database/data-source';
import {
  AdminUserEntity,
  PlatformRoleEntity,
  PlatformSettingEntity,
  ServiceEntity,
  SitePageEntity,
  SiteSectionEntity,
  SiteTemplateEntity,
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
  await dataSource.initialize();

  await resetTenant(dataSource, 'paolamendozanails');

  const tenantRepository = dataSource.getRepository(TenantEntity);
  const domainRepository = dataSource.getRepository(TenantDomainEntity);
  const settingsRepository = dataSource.getRepository(TenantSettingEntity);
  const brandingRepository = dataSource.getRepository(TenantBrandingEntity);
  const templateRepository = dataSource.getRepository(SiteTemplateEntity);
  const pageRepository = dataSource.getRepository(SitePageEntity);
  const sectionRepository = dataSource.getRepository(SiteSectionEntity);
  const serviceRepository = dataSource.getRepository(ServiceEntity);
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
      quicklysitesBaseDomain: 'quicklysites.local',
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
      domain: 'paolamendozanails.quicklysites.local',
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
    canonicalDomain: 'paolamendozanails.quicklysites.local',
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
    canonicalUrl: 'https://paolamendozanails.quicklysites.local',
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
        title: 'Paola Mendoza Nails',
        subtitle: 'Sitio informativo del negocio',
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
        text: 'Paola Mendoza Nails · Powered by Quickly Sites',
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

  const adminEmail = 'admin@quicklysites.local';
  let adminUser = await userRepository.findOne({ where: { email: adminEmail } });
  if (!adminUser) {
    adminUser = await userRepository.save({
      fullName: 'Quickly Sites Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin123*', 10),
      isActive: true,
    });
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
