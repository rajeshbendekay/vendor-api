import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { LoanType } from './loan-type.entity';
import { CreateLoanTypeDto, UpdateLoanTypeDto } from './dto';

function isDuplicateKeyError(e: unknown) {
  return (
    e instanceof QueryFailedError &&
    (e as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}

const DEFAULT_LOAN_TYPES = ['OD', 'Interest', 'Credit Card', 'Gold Loan'];

@Injectable()
export class LoanTypesService {
  constructor(
    @InjectRepository(LoanType)
    private readonly repo: Repository<LoanType>,
  ) {}

  async seedDefaults() {
    const existing = await this.repo.find();
    const existingNames = new Set(existing.map((t) => t.name));
    const toInsert = DEFAULT_LOAN_TYPES.filter(
      (name) => !existingNames.has(name),
    ).map((name) => ({
      name,
    }));
    if (toInsert.length > 0) await this.repo.save(toInsert);
  }

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const type = await this.repo.findOne({ where: { id } });
    if (!type) throw new NotFoundException(`Loan type ${id} not found`);
    return type;
  }

  async create(dto: CreateLoanTypeDto) {
    try {
      return await this.repo.save(this.repo.create(dto));
    } catch (e) {
      if (isDuplicateKeyError(e))
        throw new ConflictException('That loan type name already exists');
      throw e;
    }
  }

  async update(id: number, dto: UpdateLoanTypeDto) {
    const type = await this.findOne(id);
    Object.assign(type, dto);
    try {
      return await this.repo.save(type);
    } catch (e) {
      if (isDuplicateKeyError(e))
        throw new ConflictException('That loan type name already exists');
      throw e;
    }
  }

  async remove(id: number) {
    const type = await this.findOne(id);
    try {
      await this.repo.remove(type);
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e as { code?: string }).code === 'ER_ROW_IS_REFERENCED_2'
      ) {
        throw new ConflictException(
          'This loan type is used by existing loans and cannot be deleted',
        );
      }
      throw e;
    }
    return { deleted: true, id };
  }
}
