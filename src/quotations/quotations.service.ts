import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation } from './quotation.entity';
import { QuotationItem } from './quotation-item.entity';
import { Requirement } from '../requirements/requirement.entity';
import { GenerateQuotationDto, RequestRevisionDto } from './dto';
import { QuotationStatus, RequirementStatus } from '../common/enums';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private readonly repo: Repository<Quotation>,
    @InjectRepository(Requirement)
    private readonly reqRepo: Repository<Requirement>,
  ) {}

  findForRequirement(requirementId: number) {
    return this.repo.find({
      where: { requirementId },
      order: { revision: 'DESC' },
    });
  }

  async findOne(id: number) {
    const q = await this.repo.findOne({ where: { id } });
    if (!q) throw new NotFoundException(`Quotation ${id} not found`);
    return q;
  }

  // Snapshot the requirement's current item costs into a new quotation revision.
  // vendorCost + markup is captured per line; the client only ever sees
  // clientPrice and the grand total.
  async generate(requirementId: number, dto: GenerateQuotationDto) {
    const req = await this.reqRepo.findOne({ where: { id: requirementId } });
    if (!req) throw new NotFoundException(`Requirement ${requirementId} not found`);
    if (!req.items?.length)
      throw new BadRequestException('Requirement has no work items to quote');

    const existing = await this.findForRequirement(requirementId);
    const nextRevision =
      existing.length > 0
        ? Math.max(...existing.map((q) => q.revision)) + 1
        : 1;

    let totalVendorCost = 0;
    let totalMarkup = 0;
    const items: QuotationItem[] = req.items.map((it) => {
      const vendorCost = Number(it.vendorCost) * Number(it.quantity);
      const markup = Number(it.markup) * Number(it.quantity);
      totalVendorCost += vendorCost;
      totalMarkup += markup;
      const qi = new QuotationItem();
      qi.serviceType = it.serviceType;
      qi.description = it.description;
      qi.quantity = it.quantity;
      qi.vendorName = it.assignedVendor?.name ?? null;
      qi.vendorCost = vendorCost;
      qi.markup = markup;
      qi.clientPrice = vendorCost + markup;
      return qi;
    });

    const quotation = this.repo.create({
      requirementId,
      revision: nextRevision,
      status: QuotationStatus.DRAFT,
      totalVendorCost,
      totalMarkup,
      totalClientAmount: totalVendorCost + totalMarkup,
      internalNote: dto.internalNote,
      items,
    });
    return this.repo.save(quotation);
  }

  private async setRequirementStatus(
    requirementId: number,
    status: RequirementStatus,
  ) {
    await this.reqRepo.update({ id: requirementId }, { status });
  }

  // Share the latest draft with the client.
  async send(id: number) {
    const q = await this.findOne(id);
    q.status = QuotationStatus.SENT;
    await this.repo.save(q);
    await this.setRequirementStatus(
      q.requirementId,
      RequirementStatus.SENT_TO_CLIENT,
    );
    return q;
  }

  // Client wants a lower price -> mark this revision and flag the requirement so
  // we can pass it back to the vendor(s) and re-quote.
  async requestRevision(id: number, dto: RequestRevisionDto) {
    const q = await this.findOne(id);
    q.status = QuotationStatus.REVISION_REQUESTED;
    q.clientNote = dto.clientNote ?? q.clientNote;
    await this.repo.save(q);
    await this.setRequirementStatus(
      q.requirementId,
      RequirementStatus.NEGOTIATING,
    );
    return q;
  }

  async accept(id: number) {
    const q = await this.findOne(id);
    q.status = QuotationStatus.ACCEPTED;
    await this.repo.save(q);
    await this.setRequirementStatus(
      q.requirementId,
      RequirementStatus.ACCEPTED,
    );
    return q;
  }

  async reject(id: number) {
    const q = await this.findOne(id);
    q.status = QuotationStatus.REJECTED;
    await this.repo.save(q);
    await this.setRequirementStatus(
      q.requirementId,
      RequirementStatus.REJECTED,
    );
    return q;
  }
}
