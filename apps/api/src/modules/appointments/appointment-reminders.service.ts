import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { AppointmentEntity } from 'src/common/entities';
import { MailService } from 'src/modules/mail/mail.service';
import { getPlanMetadata, normalizePlanCode } from 'src/modules/tenants/tenant-access.constants';

@Injectable()
export class AppointmentRemindersService {
  private readonly logger = new Logger(AppointmentRemindersService.name);

  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async dispatchDueReminders() {
    const now = new Date();
    const appointments = await this.appointmentsRepository.find({
      where: {
        reminderScheduledAt: LessThanOrEqual(now),
        reminderSentAt: IsNull(),
        status: In(['pending', 'confirmed']),
        customerId: Not(IsNull()),
      },
      relations: ['customer', 'service', 'tenant'],
      order: { reminderScheduledAt: 'ASC' },
      take: 50,
    });

    for (const appointment of appointments) {
      try {
        const planMetadata = getPlanMetadata(normalizePlanCode(appointment.tenant?.plan));
        if (!planMetadata.features.includes('appointment_reminders')) {
          continue;
        }

        if (!appointment.customer?.email) {
          appointment.reminderError = 'Cliente sin correo';
          await this.appointmentsRepository.save(appointment);
          continue;
        }

        await this.mailService.sendAppointmentReminderEmail({
          to: appointment.customer.email,
          tenantId: appointment.tenantId,
          recipientName: appointment.customer.fullName,
          serviceName: appointment.service?.name ?? 'tu cita',
          startDateTime: appointment.startDateTime.toLocaleString('es-EC', {
            dateStyle: 'full',
            timeStyle: 'short',
          }),
        });

        appointment.reminderSentAt = new Date();
        appointment.reminderError = null;
        await this.appointmentsRepository.save(appointment);
      } catch (error) {
        appointment.reminderError = error instanceof Error ? error.message : 'Error enviando recordatorio';
        await this.appointmentsRepository.save(appointment);
        this.logger.error(
          `No se pudo enviar recordatorio de cita ${appointment.id}: ${
            error instanceof Error ? error.stack ?? error.message : 'error desconocido'
          }`,
        );
      }
    }
  }
}
