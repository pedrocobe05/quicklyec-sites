import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from 'src/common/entities';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customersRepository: Repository<CustomerEntity>,
  ) {}

  listByTenant(tenantId: string) {
    return this.customersRepository.find({
      where: { tenantId },
      order: { fullName: 'ASC' },
    });
  }

  async findOne(customerId: string, tenantId: string) {
    const customer = await this.customersRepository.findOne({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(customerId: string, tenantId: string, input: UpdateCustomerDto) {
    const customer = await this.findOne(customerId, tenantId);

    Object.assign(customer, {
      fullName: input.fullName ?? customer.fullName,
      email: input.email ?? customer.email,
      phone: input.phone ?? customer.phone,
      identification: input.identification ?? customer.identification,
      notes: input.notes ?? customer.notes,
    });

    return this.customersRepository.save(customer);
  }

  async remove(customerId: string, tenantId: string) {
    const customer = await this.findOne(customerId, tenantId);
    await this.customersRepository.remove(customer);
    return { success: true };
  }
}
