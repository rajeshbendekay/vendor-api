import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnType } from './return-type.entity';
import { CreateReturnTypeDto, UpdateReturnTypeDto } from './dto';

@Injectable()
export class ReturnTypesService {
  constructor(
    @InjectRepository(ReturnType)
    private readonly repo: Repository<ReturnType>,
  ) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const type = await this.repo.findOne({ where: { id } });
    if (!type) throw new NotFoundException(`Return type ${id} not found`);
    return type;
  }

  create(dto: CreateReturnTypeDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateReturnTypeDto) {
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
