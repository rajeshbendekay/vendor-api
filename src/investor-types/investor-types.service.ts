import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestorType } from './investor-type.entity';
import { CreateInvestorTypeDto, UpdateInvestorTypeDto } from './dto';

@Injectable()
export class InvestorTypesService {
  constructor(
    @InjectRepository(InvestorType)
    private readonly repo: Repository<InvestorType>,
  ) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const type = await this.repo.findOne({ where: { id } });
    if (!type) throw new NotFoundException(`Investor type ${id} not found`);
    return type;
  }

  create(dto: CreateInvestorTypeDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateInvestorTypeDto) {
    const type = await this.findOne(id);
    Object.assign(type, dto);
    return this.repo.save(type);
  }

  async remove(id: number) {
    const type = await this.findOne(id);
    await this.repo.remove(type);
    return { deleted: true, id };
  }
}
