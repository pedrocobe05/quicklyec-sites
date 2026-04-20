import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { TenantEntity, TenantMembershipEntity, TenantSettingEntity } from 'src/common/entities';
import { MailService } from '../mail/mail.service';
import { ADMINISTRATOR_ROLE_CODE } from '../tenants/tenant-access.constants';
import { SUBSCRIPTION_ALERT_THRESHOLDS, getTenantSubscriptionState } from '../tenants/subscription.utils';

@Injectable()
export class TenantSubscriptionMonitorService {
  private readonly logger = new Logger(TenantSubscriptionMonitorService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
    @InjectRepository(TenantSettingEntity)
    private readonly settingsRepository: Repository<TenantSettingEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipsRepository: Repository<TenantMembershipEntity>,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async dispatchSubscriptionAlerts() {
    const tenants = await this.tenantsRepository.find({
      where: {
        status: 'active',
        subscriptionEndsAt: Not(IsNull()),
      },
      order: { subscriptionEndsAt: 'ASC' },
    });

    for (const tenant of tenants) {
      try {
        const settings = await this.settingsRepository.findOne({
          where: { tenantId: tenant.id },
        });
        const subscription = getTenantSubscriptionState({
          subscriptionStartsAt: tenant.subscriptionStartsAt,
          subscriptionEndsAt: tenant.subscriptionEndsAt,
          timeZone: settings?.timezone,
        });
        const alertKey = subscription.isExpired
          ? 'expired'
          : SUBSCRIPTION_ALERT_THRESHOLDS.find((threshold) => subscription.daysUntilExpiry === threshold)?.toString();

        if (!alertKey || !tenant.subscriptionEndsAt) {
          continue;
        }

        const currentWindowKey = `${tenant.subscriptionStartsAt ?? ''}:${tenant.subscriptionEndsAt}`;
        const alertState = tenant.subscriptionAlertState ?? {};
        if (alertState[alertKey] === currentWindowKey) {
          continue;
        }

        const recipients = await this.resolveRecipients(tenant.id, settings?.contactEmail ?? null);
        if (recipients.length === 0) {
          this.logger.warn(`Tenant ${tenant.id} no tiene destinatarios para alertas de suscripción`);
          continue;
        }

        for (const recipient of recipients) {
          await this.mailService.sendTenantSubscriptionAlertEmail({
            to: recipient.email,
            tenantId: tenant.id,
            recipientName: recipient.fullName,
            tenantName: tenant.name,
            subscriptionStartsAt: tenant.subscriptionStartsAt,
            subscriptionEndsAt: tenant.subscriptionEndsAt,
            daysRemaining: subscription.daysUntilExpiry,
            expired: subscription.isExpired,
          });
        }

        tenant.subscriptionAlertState = {
          ...alertState,
          [alertKey]: currentWindowKey,
        };
        await this.tenantsRepository.save(tenant);
      } catch (error) {
        this.logger.error(
          `No se pudo procesar la suscripción del tenant ${tenant.id}: ${
            error instanceof Error ? error.stack ?? error.message : 'error desconocido'
          }`,
        );
      }
    }
  }

  private async resolveRecipients(tenantId: string, fallbackEmail: string | null) {
    const memberships = await this.membershipsRepository.find({
      where: { tenantId, isActive: true },
      relations: ['user', 'roleDefinition'],
    });
    const uniqueRecipients = new Map<string, { email: string; fullName?: string | null }>();

    for (const membership of memberships) {
      if (membership.roleDefinition?.code !== ADMINISTRATOR_ROLE_CODE) {
        continue;
      }

      if (!membership.user?.isActive || !membership.user.email) {
        continue;
      }

      uniqueRecipients.set(membership.user.email.toLowerCase(), {
        email: membership.user.email,
        fullName: membership.user.fullName,
      });
    }

    if (uniqueRecipients.size === 0 && fallbackEmail?.trim()) {
      uniqueRecipients.set(fallbackEmail.toLowerCase(), {
        email: fallbackEmail,
        fullName: null,
      });
    }

    return Array.from(uniqueRecipients.values());
  }
}
