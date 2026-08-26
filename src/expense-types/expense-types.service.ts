import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ExpenseType } from './expense-type.entity';
import { CreateExpenseTypeDto, UpdateExpenseTypeDto } from './dto';

function isDuplicateKeyError(e: unknown) {
  return (
    e instanceof QueryFailedError &&
    (e as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}

@Injectable()
export class ExpenseTypesService {
  constructor(
    @InjectRepository(ExpenseType)
    private readonly repo: Repository<ExpenseType>,
  ) {}

  findAll(activeOnly?: boolean) {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number) {
    const type = await this.repo.findOne({ where: { id } });
    if (!type) throw new NotFoundException(`Expense type ${id} not found`);
    return type;
  }

  async create(dto: CreateExpenseTypeDto) {
    try {
      return await this.repo.save(this.repo.create(dto));
    } catch (e) {
      if (isDuplicateKeyError(e))
        throw new ConflictException('That expense type name already exists');
      throw e;
    }
  }

  async update(id: number, dto: UpdateExpenseTypeDto) {
    const type = await this.findOne(id);
    Object.assign(type, dto);
    try {
      return await this.repo.save(type);
    } catch (e) {
      if (isDuplicateKeyError(e))
        throw new ConflictException('That expense type name already exists');
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
          'This expense type is used by existing expenses and cannot be deleted — deactivate it instead',
        );
      }
      throw e;
    }
    return { deleted: true, id };
  }
}
