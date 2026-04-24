import { MigrationInterface, QueryRunner } from 'typeorm';

const STARTER_METADATA = {
  features: ['whatsapp_cta', 'hosting_included', 'quickly_subdomain'],
  limits: {
    max_pages: 3,
    max_sections: 6,
    custom_domain: false,
    online_booking: false,
    agenda: false,
    customers: false,
    admin_users: 1,
  },
};

const PRO_METADATA = {
  features: [
    'whatsapp_cta',
    'hosting_included',
    'quickly_subdomain',
    'online_booking',
    'custom_domain',
    'admin_panel',
    'email_notifications',
    'appointment_reminders',
    'business_stats',
    'seo_initial_optimization',
  ],
  limits: {
    max_pages: 3,
    max_sections: null,
    custom_domain: true,
    online_booking: true,
    agenda: true,
    customers: true,
    admin_users: null,
  },
};

const STARTER_MODULES = ['site', 'branding', 'domains', 'settings', 'services'];
const PRO_MODULES = ['site', 'branding', 'domains', 'settings', 'services', 'staff', 'agenda', 'appointments', 'customers', 'users', 'roles', 'seo', 'notifications', 'reports'];

export class PlanConsolidation1712030000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename basic → starter
    await queryRunner.query(`
      UPDATE "subscription_plans"
      SET "code" = 'starter',
          "name" = 'Starter',
          "description" = 'Presencia digital inicial con landing profesional y contacto directo.',
          "tenantModules" = $1::jsonb,
          "metadata" = $2::jsonb,
          "updatedAt" = now()
      WHERE "code" IN ('basic', 'starter')
    `, [JSON.stringify(STARTER_MODULES), JSON.stringify(STARTER_METADATA)]);

    // Merge premium features into pro
    await queryRunner.query(`
      UPDATE "subscription_plans"
      SET "name" = 'Pro',
          "description" = 'Operación completa: reservas, agenda, panel administrativo, notificaciones y estadísticas.',
          "tenantModules" = $1::jsonb,
          "metadata" = $2::jsonb,
          "updatedAt" = now()
      WHERE "code" = 'pro'
    `, [JSON.stringify(PRO_MODULES), JSON.stringify(PRO_METADATA)]);

    // Delete premium plan (tenants ya migrados a pro, no hay FK que lo bloquee)
    await queryRunner.query(`DELETE FROM "subscription_plans" WHERE "code" = 'premium'`);

    // Migrate tenants: basic → starter
    await queryRunner.query(`
      UPDATE "tenants" SET "plan" = 'starter' WHERE "plan" IN ('basic', 'starter')
    `);

    // Migrate tenants: premium → pro
    await queryRunner.query(`
      UPDATE "tenants" SET "plan" = 'pro' WHERE "plan" IN ('premium', 'enterprise')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tenants" SET "plan" = 'basic' WHERE "plan" = 'starter'
    `);

    await queryRunner.query(`
      UPDATE "subscription_plans"
      SET "code" = 'basic', "name" = 'Básico', "updatedAt" = now()
      WHERE "code" = 'starter'
    `);

    // El down no puede recrear el plan premium eliminado con sus datos originales
    // Se recomienda restaurar desde un backup si se necesita revertir completamente
  }
}
