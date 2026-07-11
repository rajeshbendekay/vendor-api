import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { Requirement } from '../requirements/requirement.entity';
import { Quotation } from '../quotations/quotation.entity';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto';
import {
  InvoiceStatus,
  QuotationStatus,
  RequirementStatus,
} from '../common/enums';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
    @InjectRepository(Requirement)
    private readonly reqRepo: Repository<Requirement>,
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  async create(dto: CreateInvoiceDto) {
    const req = await this.reqRepo.findOne({ where: { id: dto.requirementId } });
    if (!req)
      throw new NotFoundException(`Requirement ${dto.requirementId} not found`);

    // Find the accepted quotation (explicit, or the latest accepted one).
    let quotation: Quotation | null = null;
    if (dto.quotationId) {
      quotation = await this.quotationRepo.findOne({
        where: { id: dto.quotationId },
      });
    } else {
      const quotes = await this.quotationRepo.find({
        where: { requirementId: dto.requirementId },
        order: { revision: 'DESC' },
      });
      quotation =
        quotes.find((q) => q.status === QuotationStatus.ACCEPTED) ?? null;
    }
    if (!quotation)
      throw new BadRequestException(
        'No accepted quotation found for this requirement',
      );

    const amount = Number(quotation.totalClientAmount);
    const taxPercent = dto.taxPercent ?? 18;
    const taxAmount = +(amount * (taxPercent / 100)).toFixed(2);
    const totalAmount = +(amount + taxAmount).toFixed(2);

    const count = await this.repo.count();
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const invoice = this.repo.create({
      invoiceNo,
      requirementId: dto.requirementId,
      quotationId: quotation.id,
      clientId: req.clientId,
      clientPoNumber: dto.clientPoNumber,
      amount,
      taxPercent,
      taxAmount,
      totalAmount,
      status: InvoiceStatus.RAISED,
      notes: dto.notes,
    });
    const saved = await this.repo.save(invoice);

    await this.reqRepo.update(
      { id: dto.requirementId },
      { status: RequirementStatus.INVOICED },
    );
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateInvoiceDto) {
    const inv = await this.findOne(id);
    if (dto.clientPoNumber !== undefined) inv.clientPoNumber = dto.clientPoNumber;
    if (dto.status !== undefined) inv.status = dto.status;
    if (dto.notes !== undefined) inv.notes = dto.notes;
    if (dto.taxPercent !== undefined) {
      inv.taxPercent = dto.taxPercent;
      inv.taxAmount = +(Number(inv.amount) * (dto.taxPercent / 100)).toFixed(2);
      inv.totalAmount = +(Number(inv.amount) + inv.taxAmount).toFixed(2);
    }
    return this.repo.save(inv);
  }

  async remove(id: number) {
    const inv = await this.findOne(id);
    await this.repo.remove(inv);
    return { deleted: true, id };
  }
}
