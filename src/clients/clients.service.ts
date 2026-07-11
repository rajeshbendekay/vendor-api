import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto, UpdateClientDto } from './dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const client = await this.repo.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  create(dto: CreateClientDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateClientDto) {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    return this.repo.save(client);
  }

  async remove(id: number) {
    const client = await this.findOne(id);
    await this.repo.remove(client);
    return { deleted: true, id };
  }
}
