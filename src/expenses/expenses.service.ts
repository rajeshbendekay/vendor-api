import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Expense, PaymentMode } from './expense.entity';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { ExpenseTypesService } from '../expense-types/expense-types.service';
import { User } from '../users/user.entity';

function omitPassword(user: User) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

// createdBy/updatedBy are eager User relations — strip passwordHash before
// this ever reaches a response, same as users.service.ts's omitPassword.
function omitUserPasswords(expense: Expense): Expense {
  return {
    ...expense,
    createdBy: omitPassword(expense.createdBy) as User,
    updatedBy: expense.updatedBy ? (omitPassword(expense.updatedBy) as User) : null,
  };
}

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  expenseTypeId?: number;
  paymentMode?: PaymentMode;
  minAmount?: number;
  maxAmount?: number;
  keyword?: string;
  sortBy?: 'date' | 'amount';
  sortDir?: 'ASC' | 'DESC';
}

// Local (server) calendar date as YYYY-MM-DD — used as "today" for the
// no-future-dated-expenses rule. Deliberately not UTC: a UTC day boundary
// would reject/accept dates near midnight inconsistently with what the
// person entering the expense sees on their clock.
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Injectable()
export class ExpensesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'expenses');

  constructor(
    @InjectRepository(Expense)
    private readonly repo: Repository<Expense>,
    private readonly expenseTypesService: ExpenseTypesService,
  ) {
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  private validateExpenseDate(expenseDate: string) {
    if (expenseDate > todayIso()) {
      throw new BadRequestException('Expense date cannot be in the future');
    }
  }

  private deleteAttachmentFile(filePath: string | null) {
    if (!filePath) return;
    fs.unlink(filePath, () => {
      // Ignore — a missing file on disk shouldn't block the DB update.
    });
  }

  async findAll(filters: ExpenseFilters = {}) {
    const qb = this.repo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.expenseType', 'expenseType')
      .leftJoinAndSelect('expense.createdBy', 'createdBy')
      .leftJoinAndSelect('expense.updatedBy', 'updatedBy');

    if (filters.dateFrom)
      qb.andWhere('expense.expenseDate >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    if (filters.dateTo)
      qb.andWhere('expense.expenseDate <= :dateTo', { dateTo: filters.dateTo });
    if (filters.expenseTypeId)
      qb.andWhere('expense.expenseTypeId = :expenseTypeId', {
        expenseTypeId: filters.expenseTypeId,
      });
    if (filters.paymentMode)
      qb.andWhere('expense.paymentMode = :paymentMode', {
        paymentMode: filters.paymentMode,
      });
    if (filters.minAmount != null)
      qb.andWhere('expense.amount >= :minAmount', {
        minAmount: filters.minAmount,
      });
    if (filters.maxAmount != null)
      qb.andWhere('expense.amount <= :maxAmount', {
        maxAmount: filters.maxAmount,
      });
    if (filters.keyword)
      qb.andWhere(
        '(expense.note LIKE :kw OR expense.referenceNo LIKE :kw)',
        { kw: `%${filters.keyword}%` },
      );

    const sortColumn =
      filters.sortBy === 'amount' ? 'expense.amount' : 'expense.expenseDate';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDir).addOrderBy('expense.id', 'DESC');

    const rows = await qb.getMany();
    return rows.map(omitUserPasswords);
  }

  async findOne(id: number) {
    const expense = await this.repo.findOne({ where: { id } });
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);
    return omitUserPasswords(expense);
  }

  async create(
    dto: CreateExpenseDto,
    file: Express.Multer.File | undefined,
    userId: number,
  ) {
    const type = await this.expenseTypesService.findOne(dto.expenseTypeId);
    if (!type.isActive) {
      throw new BadRequestException(
        'This expense type is deactivated and cannot be used for new expenses',
      );
    }
    this.validateExpenseDate(dto.expenseDate);

    const expense = this.repo.create({
      ...dto,
      createdById: userId,
      attachmentPath: file ? file.path : null,
      attachmentOriginalName: file ? file.originalname : null,
    });
    const saved = await this.repo.save(expense);
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdateExpenseDto,
    file: Express.Multer.File | undefined,
    userId: number,
  ) {
    const expense = await this.findOne(id);

    if (
      dto.expenseTypeId != null &&
      dto.expenseTypeId !== expense.expenseTypeId
    ) {
      const type = await this.expenseTypesService.findOne(dto.expenseTypeId);
      if (!type.isActive) {
        throw new BadRequestException(
          'This expense type is deactivated and cannot be used for new expenses',
        );
      }
    }
    if (dto.expenseDate) this.validateExpenseDate(dto.expenseDate);

    const { removeAttachment, ...rest } = dto;
    Object.assign(expense, rest);
    expense.updatedById = userId;

    if (file) {
      this.deleteAttachmentFile(expense.attachmentPath);
      expense.attachmentPath = file.path;
      expense.attachmentOriginalName = file.originalname;
    } else if (removeAttachment) {
      this.deleteAttachmentFile(expense.attachmentPath);
      expense.attachmentPath = null;
      expense.attachmentOriginalName = null;
    }

    const saved = await this.repo.save(expense);
    return this.findOne(saved.id);
  }

  async remove(id: number) {
    const expense = await this.findOne(id);
    this.deleteAttachmentFile(expense.attachmentPath);
    await this.repo.remove(expense);
    return { deleted: true, id };
  }

  async getAttachment(id: number) {
    const expense = await this.findOne(id);
    if (!expense.attachmentPath) {
      throw new NotFoundException('This expense has no attachment');
    }
    return {
      path: expense.attachmentPath,
      originalName: expense.attachmentOriginalName ?? 'attachment',
    };
  }

  async summary() {
    const totalRow = await this.repo
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'total')
      .getRawOne();

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;

    const monthRow = await this.repo
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'total')
      .where('expense.expenseDate >= :monthStart', { monthStart })
      .getRawOne();

    const yearRow = await this.repo
      .createQueryBuilder('expense')
      .select('COALESCE(SUM(expense.amount), 0)', 'total')
      .where('expense.expenseDate >= :yearStart', { yearStart })
      .getRawOne();

    const byTypeRows = await this.repo
      .createQueryBuilder('expense')
      .leftJoin('expense.expenseType', 'expenseType')
      .select('expense.expenseTypeId', 'expenseTypeId')
      .addSelect('expenseType.name', 'name')
      .addSelect('COALESCE(SUM(expense.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('expense.expenseTypeId')
      .addGroupBy('expenseType.name')
      .orderBy('total', 'DESC')
      .getRawMany();

    return {
      totalExpenses: Number(totalRow.total),
      currentMonthExpenses: Number(monthRow.total),
      currentYearExpenses: Number(yearRow.total),
      byType: byTypeRows.map((r) => ({
        expenseTypeId: r.expenseTypeId,
        name: r.name,
        total: Number(r.total),
        count: Number(r.count),
      })),
    };
  }
}
