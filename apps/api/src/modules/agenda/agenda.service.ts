import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AvailabilityRuleEntity, ScheduleBlockEntity } from 'src/common/entities';
import { CreateAvailabilityRuleDto } from './dto/create-availability-rule.dto';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateAvailabilityRuleDto } from './dto/update-availability-rule.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';

@Injectable()
export class AgendaService {
  constructor(
    @InjectRepository(AvailabilityRuleEntity)
    private readonly availabilityRulesRepository: Repository<AvailabilityRuleEntity>,
    @InjectRepository(ScheduleBlockEntity)
    private readonly scheduleBlocksRepository: Repository<ScheduleBlockEntity>,
  ) {}

  private normalizeStaffId(staffId?: string | null) {
    return staffId?.trim() || null;
  }

  private parseTimeToMinutes(value: string) {
    const [hours = '0', minutes = '0'] = value.split(':');
    return Number(hours) * 60 + Number(minutes);
  }

  private validateTimeRange(startTime: string, endTime: string) {
    if (this.parseTimeToMinutes(startTime) >= this.parseTimeToMinutes(endTime)) {
      throw new BadRequestException('La hora de inicio debe ser menor que la hora de fin');
    }
  }

  private async ensureNoDuplicateRule(input: {
    tenantId: string;
    staffId?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotIntervalMinutes: number;
    excludeId?: string;
  }) {
    const normalizedStaffId = this.normalizeStaffId(input.staffId);
    const duplicate = await this.availabilityRulesRepository.findOne({
      where: {
        tenantId: input.tenantId,
        staffId: normalizedStaffId ?? IsNull(),
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotIntervalMinutes: input.slotIntervalMinutes,
      },
    });

    if (duplicate && duplicate.id !== input.excludeId) {
      throw new BadRequestException('Ya existe una regla de disponibilidad idéntica para ese día y horario');
    }
  }

  private async ensureNoOverlappingRule(input: {
    tenantId: string;
    staffId?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    excludeId?: string;
  }) {
    const normalizedStaffId = this.normalizeStaffId(input.staffId);
    const rules = await this.availabilityRulesRepository.find({
      where: {
        tenantId: input.tenantId,
        staffId: normalizedStaffId ?? IsNull(),
        dayOfWeek: input.dayOfWeek,
      },
    });

    const nextStart = this.parseTimeToMinutes(input.startTime);
    const nextEnd = this.parseTimeToMinutes(input.endTime);
    const overlapping = rules.find((rule) => {
      if (rule.id === input.excludeId) {
        return false;
      }

      const ruleStart = this.parseTimeToMinutes(rule.startTime);
      const ruleEnd = this.parseTimeToMinutes(rule.endTime);
      return nextStart < ruleEnd && ruleStart < nextEnd;
    });

    if (overlapping) {
      throw new BadRequestException('La regla se cruza con otra disponibilidad existente para ese día');
    }
  }

  listAvailabilityRules(tenantId: string) {
    return this.availabilityRulesRepository.find({
      where: { tenantId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async createAvailabilityRule(input: CreateAvailabilityRuleDto) {
    this.validateTimeRange(input.startTime, input.endTime);
    const staffId = this.normalizeStaffId(input.staffId);
    await this.ensureNoDuplicateRule({
      tenantId: input.tenantId,
      staffId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      slotIntervalMinutes: input.slotIntervalMinutes,
    });
    await this.ensureNoOverlappingRule({
      tenantId: input.tenantId,
      staffId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    return this.availabilityRulesRepository.save({
      tenantId: input.tenantId,
      staffId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      slotIntervalMinutes: input.slotIntervalMinutes,
      isActive: input.isActive ?? true,
    });
  }

  async updateAvailabilityRule(ruleId: string, tenantId: string, input: UpdateAvailabilityRuleDto) {
    const rule = await this.availabilityRulesRepository.findOne({
      where: { id: ruleId, tenantId },
    });
    if (!rule) {
      throw new NotFoundException('Availability rule not found');
    }

    const nextStaffId = input.staffId !== undefined ? this.normalizeStaffId(input.staffId) : rule.staffId;
    const nextDayOfWeek = input.dayOfWeek ?? rule.dayOfWeek;
    const nextStartTime = input.startTime ?? rule.startTime;
    const nextEndTime = input.endTime ?? rule.endTime;
    const nextInterval = input.slotIntervalMinutes ?? rule.slotIntervalMinutes;

    this.validateTimeRange(nextStartTime, nextEndTime);
    await this.ensureNoDuplicateRule({
      tenantId,
      staffId: nextStaffId,
      dayOfWeek: nextDayOfWeek,
      startTime: nextStartTime,
      endTime: nextEndTime,
      slotIntervalMinutes: nextInterval,
      excludeId: rule.id,
    });
    await this.ensureNoOverlappingRule({
      tenantId,
      staffId: nextStaffId,
      dayOfWeek: nextDayOfWeek,
      startTime: nextStartTime,
      endTime: nextEndTime,
      excludeId: rule.id,
    });

    Object.assign(rule, {
      staffId: nextStaffId,
      dayOfWeek: nextDayOfWeek,
      startTime: nextStartTime,
      endTime: nextEndTime,
      slotIntervalMinutes: nextInterval,
      isActive: input.isActive ?? rule.isActive,
    });

    return this.availabilityRulesRepository.save(rule);
  }

  async removeAvailabilityRule(ruleId: string, tenantId: string) {
    const rule = await this.availabilityRulesRepository.findOne({
      where: { id: ruleId, tenantId },
    });
    if (!rule) {
      throw new NotFoundException('Availability rule not found');
    }
    await this.availabilityRulesRepository.remove(rule);
    return { success: true };
  }

  listScheduleBlocks(tenantId: string) {
    return this.scheduleBlocksRepository.find({
      where: { tenantId },
      order: { startDateTime: 'DESC' },
    });
  }

  createScheduleBlock(input: CreateScheduleBlockDto) {
    return this.scheduleBlocksRepository.save({
      tenantId: input.tenantId,
      staffId: input.staffId ?? null,
      startDateTime: new Date(input.startDateTime),
      endDateTime: new Date(input.endDateTime),
      reason: input.reason,
      blockType: input.blockType ?? 'manual',
    });
  }

  async updateScheduleBlock(blockId: string, tenantId: string, input: UpdateScheduleBlockDto) {
    const block = await this.scheduleBlocksRepository.findOne({
      where: { id: blockId, tenantId },
    });
    if (!block) {
      throw new NotFoundException('Schedule block not found');
    }

    Object.assign(block, {
      staffId: input.staffId ?? block.staffId,
      startDateTime: input.startDateTime ? new Date(input.startDateTime) : block.startDateTime,
      endDateTime: input.endDateTime ? new Date(input.endDateTime) : block.endDateTime,
      reason: input.reason ?? block.reason,
      blockType: input.blockType ?? block.blockType,
    });

    return this.scheduleBlocksRepository.save(block);
  }

  async removeScheduleBlock(blockId: string, tenantId: string) {
    const block = await this.scheduleBlocksRepository.findOne({
      where: { id: blockId, tenantId },
    });
    if (!block) {
      throw new NotFoundException('Schedule block not found');
    }
    await this.scheduleBlocksRepository.remove(block);
    return { success: true };
  }
}
