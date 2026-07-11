import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './vendor.entity';
import { CreateVendorDto, UpdateVendorDto } from './dto';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly repo: Repository<Vendor>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const vendor = await this.repo.findOne({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  create(dto: CreateVendorDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateVendorDto) {
    const vendor = await this.findOne(id);
    Object.assign(vendor, dto);
    return this.repo.save(vendor);
  }

  async remove(id: number) {
    const vendor = await this.findOne(id);
    await this.repo.remove(vendor);
    return { deleted: true, id };
  }
}
