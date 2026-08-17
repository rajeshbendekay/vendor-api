import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './loan.entity';
import { CreateLoanDto, UpdateLoanDto } from './dto';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly repo: Repository<Loan>,
  ) {}

  // endDate is always derived from startDate + totalEmis months — never
  // accepted from the client.
  private computeEndDate(
    startDate?: string | null,
    totalEmis?: number | null,
  ): string | null {
    if (!startDate || !totalEmis) return null;
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + totalEmis);
    return end.toISOString().slice(0, 10);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const loan = await this.repo.findOne({ where: { id } });
    if (!loan) throw new NotFoundException(`Loan ${id} not found`);
    return loan;
  }

  async create(dto: CreateLoanDto) {
    const loan = this.repo.create({
      ...dto,
      principalOutstanding: dto.principalOutstanding ?? dto.loanAmount,
    });
    loan.endDate = this.computeEndDate(loan.startDate, loan.totalEmis);
    const saved = await this.repo.save(loan);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateLoanDto) {
    const loan = await this.findOne(id);
    Object.assign(loan, dto);
    loan.endDate = this.computeEndDate(loan.startDate, loan.totalEmis);
    return this.repo.save(loan);
  }

  async remove(id: number) {
    const loan = await this.findOne(id);
    await this.repo.remove(loan);
    return { deleted: true, id };
  }
}
