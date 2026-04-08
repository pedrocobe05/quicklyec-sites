import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AvailabilitySlot } from '@quickly-sites/shared';
import { In, IsNull, Repository } from 'typeorm';
import {
  AppointmentEntity,
  AvailabilityRuleEntity,
  CustomerEntity,
  ScheduleBlockEntity,
  StaffServiceEntity,
} from 'src/common/entities';
import { getPlanMetadata, normalizePlanCode } from 'src/modules/tenants/tenant-access.constants';
import { ServicesService } from 'src/modules/services/services.service';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

interface AvailabilityQuery {
  tenantId: string;
  serviceId: string;
  date: string;
  staffId?: string;
}

@Injectable()
export class AppointmentsService {
  private static readonly BLOCKING_STATUSES = ['pending', 'confirmed'] as const;

  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    @InjectRepository(AvailabilityRuleEntity)
    private readonly availabilityRepository: Repository<AvailabilityRuleEntity>,
    @InjectRepository(ScheduleBlockEntity)
    private readonly scheduleBlocksRepository: Repository<ScheduleBlockEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customersRepository: Repository<CustomerEntity>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServicesRepository: Repository<StaffServiceEntity>,
    private readonly servicesService: ServicesService,
  ) {}

  private computeReminderScheduledAt(startDateTime: Date) {
    const reminderDate = new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);
    return reminderDate > new Date() ? reminderDate : new Date();
  }

  private normalizeTimeValue(time: string) {
    return /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : `${time}:00`;
  }

  private async applyReminderState(appointment: AppointmentEntity) {
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      appointment.reminderScheduledAt = null;
      appointment.reminderSentAt = null;
      appointment.reminderError = null;
      return appointment;
    }

    const tenantPlan = appointment.tenant?.plan ? normalizePlanCode(appointment.tenant.plan) : null;
    const supportsReminders = tenantPlan
      ? getPlanMetadata(tenantPlan).features.includes('appointment_reminders')
      : true;

    if (!supportsReminders) {
      appointment.reminderScheduledAt = null;
      appointment.reminderSentAt = null;
      appointment.reminderError = null;
      return appointment;
    }

    appointment.reminderScheduledAt = this.computeReminderScheduledAt(appointment.startDateTime);
    appointment.reminderSentAt = null;
    appointment.reminderError = null;
    return appointment;
  }

  private toDateWithTime(date: string, time: string) {
    return new Date(`${date}T${this.normalizeTimeValue(time)}`);
  }

  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart < bEnd && bStart < aEnd;
  }

  private getMinimumBookableStart() {
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  private isRuleCompatible(rule: AvailabilityRuleEntity, startDateTime: Date, endDateTime: Date) {
    const startTime = startDateTime.toISOString().slice(11, 16);
    const endTime = endDateTime.toISOString().slice(11, 16);
    return rule.startTime <= startTime && rule.endTime >= endTime;
  }

  private async getEligibleStaffIds(serviceId: string, requestedStaffId?: string) {
    const links = await this.staffServicesRepository.find({
      where: { serviceId },
    });

    const eligibleStaffIds = [...new Set(links.map((link) => link.staffId))];
    if (eligibleStaffIds.length === 0) {
      return [];
    }

    if (!requestedStaffId) {
      return eligibleStaffIds;
    }

    return eligibleStaffIds.includes(requestedStaffId) ? [requestedStaffId] : [];
  }

  private async ensureAppointmentSlotAvailable(input: {
    tenantId: string;
    serviceId: string;
    startDateTime: Date;
    endDateTime: Date;
    staffId?: string | null;
    ignoreAppointmentId?: string;
  }) {
    const eligibleStaffIds = await this.getEligibleStaffIds(input.serviceId, input.staffId ?? undefined);
    if (eligibleStaffIds.length === 0) {
      throw new BadRequestException('El servicio seleccionado no tiene profesionales disponibles');
    }

    const appointments = await this.appointmentsRepository.find({
      where: { tenantId: input.tenantId },
    });
    const blocks = await this.scheduleBlocksRepository.find({
      where: input.staffId
        ? [{ tenantId: input.tenantId, staffId: input.staffId }, { tenantId: input.tenantId, staffId: IsNull() }]
        : [
          ...eligibleStaffIds.map((staffId) => ({ tenantId: input.tenantId, staffId })),
          { tenantId: input.tenantId, staffId: IsNull() },
        ],
    });

    const hasAppointment = appointments.some((appointment) => {
      if (input.ignoreAppointmentId && appointment.id === input.ignoreAppointmentId) {
        return false;
      }

      if (!AppointmentsService.BLOCKING_STATUSES.includes(appointment.status as (typeof AppointmentsService.BLOCKING_STATUSES)[number])) {
        return false;
      }

      if (input.staffId) {
        return (appointment.staffId === input.staffId || appointment.staffId == null)
          && this.overlaps(input.startDateTime, input.endDateTime, appointment.startDateTime, appointment.endDateTime);
      }

      return (appointment.staffId == null || eligibleStaffIds.includes(appointment.staffId))
        && this.overlaps(input.startDateTime, input.endDateTime, appointment.startDateTime, appointment.endDateTime);
    });

    if (hasAppointment) {
      throw new BadRequestException('Ya existe una reserva en ese horario');
    }

    const hasBlock = blocks.some((block) =>
      this.overlaps(input.startDateTime, input.endDateTime, block.startDateTime, block.endDateTime),
    );

    if (hasBlock) {
      throw new BadRequestException('El horario está bloqueado en agenda');
    }

    const dayOfWeek = input.startDateTime.getDay();
    const rules = await this.availabilityRepository.find({
      where: { tenantId: input.tenantId, dayOfWeek, isActive: true, staffId: In(eligibleStaffIds) },
    });
    const matchingRules = input.staffId
      ? rules.filter((rule) => rule.staffId === input.staffId)
      : rules;

    const coveredByRule = matchingRules.some((rule) =>
      this.isRuleCompatible(rule, input.startDateTime, input.endDateTime),
    );

    if (!coveredByRule) {
      throw new BadRequestException('El horario seleccionado ya no está disponible');
    }
  }

  async getAvailability(query: AvailabilityQuery): Promise<AvailabilitySlot[]> {
    const service = await this.servicesService.findOne(query.serviceId);
    if (service.tenantId !== query.tenantId) {
      throw new NotFoundException('Service not found');
    }

    const eligibleStaffIds = await this.getEligibleStaffIds(query.serviceId, query.staffId);
    if (eligibleStaffIds.length === 0) {
      return [];
    }

    const targetDate = new Date(`${query.date}T00:00:00`);
    const dayOfWeek = targetDate.getDay();

    const rules = await this.availabilityRepository.find({
      where: { tenantId: query.tenantId, dayOfWeek, isActive: true, staffId: In(eligibleStaffIds) },
      relations: { staff: true },
    });
    const filteredRules = query.staffId ? rules.filter((rule) => rule.staffId === query.staffId) : rules;

    const dayStart = new Date(`${query.date}T00:00:00`);
    const dayEnd = new Date(`${query.date}T23:59:59`);

    const [appointments, blocks] = await Promise.all([
      this.appointmentsRepository.find({
        where: { tenantId: query.tenantId },
      }),
      this.scheduleBlocksRepository.find({
        where: query.staffId
          ? [{ tenantId: query.tenantId, staffId: query.staffId }, { tenantId: query.tenantId, staffId: IsNull() }]
          : [
            ...eligibleStaffIds.map((staffId) => ({ tenantId: query.tenantId, staffId })),
            { tenantId: query.tenantId, staffId: IsNull() },
          ],
      }),
    ]);

    const sameDayAppointments = appointments.filter(
      (appointment) =>
        AppointmentsService.BLOCKING_STATUSES.includes(appointment.status as (typeof AppointmentsService.BLOCKING_STATUSES)[number])
        && appointment.startDateTime >= dayStart
        && appointment.startDateTime <= dayEnd
        && (appointment.staffId == null || eligibleStaffIds.includes(appointment.staffId)),
    );
    const sameDayBlocks = blocks.filter(
      (block) => block.startDateTime <= dayEnd && block.endDateTime >= dayStart,
    );
    const minimumBookableStart = this.getMinimumBookableStart();

    const slots: AvailabilitySlot[] = [];

    for (const rule of filteredRules) {
      const interval = rule.slotIntervalMinutes;
      let current = this.toDateWithTime(query.date, rule.startTime);
      const end = this.toDateWithTime(query.date, rule.endTime);

      while (current < end) {
        const slotEnd = new Date(current.getTime() + service.durationMinutes * 60 * 1000);
        if (slotEnd > end) {
          break;
        }

        if (current < minimumBookableStart) {
          current = new Date(current.getTime() + interval * 60 * 1000);
          continue;
        }

        const hasAppointment = sameDayAppointments.some((appointment) =>
          (appointment.staffId === rule.staffId || appointment.staffId == null)
          && this.overlaps(current, slotEnd, appointment.startDateTime, appointment.endDateTime),
        );
        const hasBlock = sameDayBlocks.some((block) =>
          (block.staffId === rule.staffId || block.staffId == null)
          && this.overlaps(current, slotEnd, block.startDateTime, block.endDateTime),
        );

        if (!hasAppointment && !hasBlock) {
          slots.push({
            start: current.toISOString(),
            end: slotEnd.toISOString(),
            staffId: rule.staffId,
            staffName: rule.staff?.name ?? null,
          });
        }

        current = new Date(current.getTime() + interval * 60 * 1000);
      }
    }

    return slots.sort((left, right) => left.start.localeCompare(right.start) || (left.staffName ?? '').localeCompare(right.staffName ?? ''));
  }

  async createPublicAppointment(tenantId: string, input: {
    serviceId: string;
    staffId?: string;
    startDateTime: string;
    customer: {
      fullName: string;
      email: string;
      phone: string;
      notes?: string;
    };
    notes?: string;
  }) {
    const service = await this.servicesService.findOne(input.serviceId);
    const startDateTime = new Date(input.startDateTime);
    const endDateTime = new Date(startDateTime.getTime() + service.durationMinutes * 60 * 1000);

    await this.ensureAppointmentSlotAvailable({
      tenantId,
      serviceId: input.serviceId,
      startDateTime,
      endDateTime,
      staffId: input.staffId ?? null,
    });

    let customer = await this.customersRepository.findOne({
      where: { tenantId, email: input.customer.email.toLowerCase() },
    });

    if (!customer) {
      customer = await this.customersRepository.save({
        tenantId,
        fullName: input.customer.fullName,
        email: input.customer.email.toLowerCase(),
        phone: input.customer.phone,
        notes: input.customer.notes ?? null,
        tags: null,
      });
    }

    const appointment = await this.appointmentsRepository.save({
      tenantId,
      customerId: customer.id,
      serviceId: service.id,
      staffId: input.staffId ?? null,
      source: 'public_site',
      status: 'pending',
      startDateTime,
      endDateTime,
      notes: input.notes ?? null,
      internalNotes: null,
      reminderScheduledAt: this.computeReminderScheduledAt(startDateTime),
      reminderSentAt: null,
      reminderError: null,
    });

    return {
      id: appointment.id,
      status: appointment.status,
      startDateTime: appointment.startDateTime,
      endDateTime: appointment.endDateTime,
    };
  }

  listByTenant(tenantId: string) {
    return this.appointmentsRepository.find({
      where: { tenantId },
      relations: ['customer', 'service', 'staff'],
      order: { startDateTime: 'DESC' },
    });
  }

  async updateStatus(appointmentId: string, tenantId: string, status: AppointmentEntity['status']) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['customer', 'service', 'staff', 'tenant'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    appointment.status = status;
    await this.applyReminderState(appointment);
    return this.appointmentsRepository.save(appointment);
  }

  async updateAppointment(appointmentId: string, tenantId: string, input: UpdateAppointmentDto) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, tenantId },
      relations: ['service', 'tenant'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    let durationMinutes = appointment.service.durationMinutes;

    if (input.serviceId && input.serviceId !== appointment.serviceId) {
      const service = await this.servicesService.findOne(input.serviceId);
      appointment.serviceId = service.id;
      durationMinutes = service.durationMinutes;
    }

    if (input.customerId) {
      appointment.customerId = input.customerId;
    }

    if (input.staffId !== undefined) {
      appointment.staffId = input.staffId || null;
    }

    if (input.startDateTime) {
      const nextStart = new Date(input.startDateTime);
      appointment.startDateTime = nextStart;
      appointment.endDateTime = new Date(nextStart.getTime() + durationMinutes * 60 * 1000);
    }

    appointment.notes = input.notes ?? appointment.notes;
    appointment.internalNotes = input.internalNotes ?? appointment.internalNotes;

    await this.ensureAppointmentSlotAvailable({
      tenantId,
      serviceId: appointment.serviceId,
      startDateTime: appointment.startDateTime,
      endDateTime: appointment.endDateTime,
      staffId: appointment.staffId,
      ignoreAppointmentId: appointment.id,
    });

    await this.applyReminderState(appointment);

    return this.appointmentsRepository.save(appointment);
  }
}
