import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Investor } from './investor.entity';
import { CreateInvestorDto, UpdateInvestorDto } from './dto';

@Injectable()
export class InvestorsService {
  constructor(
    @InjectRepository(Investor)
    private readonly repo: Repository<Investor>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const investor = await this.repo.findOne({ where: { id } });
    if (!investor) throw new NotFoundException(`Investor ${id} not found`);
    return investor;
  }

  create(dto: CreateInvestorDto) {
    const investor = this.repo.create(dto);
    return this.repo.save(investor);
  }

  async update(id: number, dto: UpdateInvestorDto) {
    const investor = await this.findOne(id);
    Object.assign(investor, dto);
    return this.repo.save(investor);
  }

  async remove(id: number) {
    const investor = await this.findOne(id);
    try {
      await this.repo.remove(investor);
    } catch (e) {
      // Investments are soft-deleted, so their rows (and the FK to this
      // investor) always persist — surface that as a clear conflict
      // instead of a raw DB error.
      if (
        e instanceof QueryFailedError &&
        (e as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2'
      ) {
        throw new ConflictException(
          'This investor has investment records and cannot be deleted',
        );
      }
      throw e;
    }
    return { deleted: true, id };
  }
}
