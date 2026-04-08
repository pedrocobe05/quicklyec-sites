import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentEntity, ServiceEntity, StaffServiceEntity } from 'src/common/entities';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServicesRepository: Repository<StaffServiceEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
  ) {}

  findPublicByTenant(tenantId: string) {
    return this.servicesRepository.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  findAdminByTenant(tenantId: string) {
    return this.servicesRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(serviceId: string) {
    const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  create(input: CreateServiceDto) {
    return this.servicesRepository.save({
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      durationMinutes: input.durationMinutes,
      price: input.price ?? null,
      isActive: input.isActive ?? true,
      category: input.category ?? null,
      color: input.color ?? null,
    });
  }

  async update(serviceId: string, tenantId: string, input: UpdateServiceDto) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId, tenantId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    Object.assign(service, {
      name: input.name ?? service.name,
      description: input.description ?? service.description,
      durationMinutes: input.durationMinutes ?? service.durationMinutes,
      price: input.price ?? service.price,
      isActive: input.isActive ?? service.isActive,
      category: input.category ?? service.category,
      color: input.color ?? service.color,
    });

    return this.servicesRepository.save(service);
  }

  async remove(serviceId: string, tenantId: string) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId, tenantId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const [staffLinksCount, appointmentsCount] = await Promise.all([
      this.staffServicesRepository.count({ where: { serviceId } }),
      this.appointmentsRepository.count({ where: { tenantId, serviceId } }),
    ]);

    if (staffLinksCount > 0 || appointmentsCount > 0) {
      service.isActive = false;
      await this.servicesRepository.save(service);
      return {
        success: true,
        mode: 'deactivated' as const,
        message: 'Servicio desactivado para conservar trazabilidad.',
      };
    }

    await this.servicesRepository.remove(service);
    return {
      success: true,
      mode: 'deleted' as const,
      message: 'Servicio eliminado correctamente.',
    };
  }
}
