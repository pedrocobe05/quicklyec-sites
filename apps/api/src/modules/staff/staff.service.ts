import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffEntity } from 'src/common/entities';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffEntity)
    private readonly staffRepository: Repository<StaffEntity>,
  ) {}

  findPublicByTenant(tenantId: string) {
    return this.staffRepository.find({
      where: { tenantId, isActive: true, isBookable: true },
      order: { name: 'ASC' },
    });
  }

  findAdminByTenant(tenantId: string) {
    return this.staffRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  create(input: CreateStaffDto) {
    return this.staffRepository.save({
      tenantId: input.tenantId,
      name: input.name,
      bio: input.bio ?? null,
      avatarUrl: input.avatarUrl ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      isBookable: input.isBookable ?? true,
      isActive: input.isActive ?? true,
    });
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

    return this.staffRepository.save(staff);
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
