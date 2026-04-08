import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceEntity, StaffEntity, StaffServiceEntity } from 'src/common/entities';
import { FilesService } from 'src/modules/files/files.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly staffRepository: Repository<StaffEntity>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServicesRepository: Repository<StaffServiceEntity>,
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    private readonly filesService: FilesService,
  ) {}

  private async resolveStaffAvatar<T extends { tenantId: string; avatarUrl?: string | null }>(staff: T) {
    return {
      ...staff,
      avatarUrl: await this.filesService.resolveStoredReference(staff.avatarUrl, staff.tenantId),
    };
  }

  async findPublicByTenant(tenantId: string) {
    const staff = await this.staffRepository.find({
      where: { tenantId, isActive: true, isBookable: true },
      relations: { staffServices: true },
      order: { name: 'ASC' },
    });

    return Promise.all(staff.map((member) => this.resolveStaffAvatar(member)));
  }

  async findAdminByTenant(tenantId: string) {
    const staff = await this.staffRepository.find({
      where: { tenantId },
      relations: { staffServices: { service: true } },
      order: { name: 'ASC' },
    });

    return Promise.all(staff.map((member) => this.resolveStaffAvatar(member)));
  }

  private async syncStaffServices(tenantId: string, staffId: string, serviceIds?: string[]) {
    const normalizedServiceIds = [...new Set((serviceIds ?? []).map((value) => value.trim()).filter(Boolean))];
    const existingLinks = await this.staffServicesRepository.find({
      where: { staffId },
    });

    if (normalizedServiceIds.length === 0) {
      if (existingLinks.length > 0) {
        await this.staffServicesRepository.remove(existingLinks);
      }
      return;
    }

    const services = await this.servicesRepository.find({
      where: { tenantId },
    });
    const validServiceIds = new Set(services.map((service) => service.id));
    const nextServiceIds = normalizedServiceIds.filter((serviceId) => validServiceIds.has(serviceId));

    const existingByServiceId = new Map(existingLinks.map((link) => [link.serviceId, link]));
    const linksToRemove = existingLinks.filter((link) => !nextServiceIds.includes(link.serviceId));
    const linksToCreate = nextServiceIds
      .filter((serviceId) => !existingByServiceId.has(serviceId))
      .map((serviceId) =>
        this.staffServicesRepository.create({
          staffId,
          serviceId,
        }),
      );

    if (linksToRemove.length > 0) {
      await this.staffServicesRepository.remove(linksToRemove);
    }
    if (linksToCreate.length > 0) {
      await this.staffServicesRepository.save(linksToCreate);
    }
  }

  async create(input: CreateStaffDto) {
    const staff = await this.staffRepository.save({
      tenantId: input.tenantId,
      name: input.name,
      bio: input.bio ?? null,
      avatarUrl: input.avatarUrl ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      isBookable: input.isBookable ?? true,
      isActive: input.isActive ?? true,
    });

    await this.syncStaffServices(input.tenantId, staff.id, input.serviceIds);

    const created = await this.staffRepository.findOne({
      where: { id: staff.id },
      relations: { staffServices: { service: true } },
    });

    return created ? this.resolveStaffAvatar(created) : created;
  }

  async update(staffId: string, tenantId: string, input: UpdateStaffDto) {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId, tenantId },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    Object.assign(staff, {
      name: input.name ?? staff.name,
      bio: input.bio ?? staff.bio,
      avatarUrl: input.avatarUrl ?? staff.avatarUrl,
      email: input.email ?? staff.email,
      phone: input.phone ?? staff.phone,
      isBookable: input.isBookable ?? staff.isBookable,
      isActive: input.isActive ?? staff.isActive,
    });

    await this.staffRepository.save(staff);
    if (input.serviceIds !== undefined) {
      await this.syncStaffServices(tenantId, staffId, input.serviceIds);
    }

    const updated = await this.staffRepository.findOne({
      where: { id: staff.id, tenantId },
      relations: { staffServices: { service: true } },
    });

    return updated ? this.resolveStaffAvatar(updated) : updated;
  }

  async remove(staffId: string, tenantId: string) {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId, tenantId },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    await this.staffRepository.remove(staff);
    return { success: true };
  }
}
