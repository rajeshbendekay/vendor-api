import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requirement } from './requirement.entity';
import { RequirementItem } from './requirement-item.entity';
import { Vendor } from '../vendors/vendor.entity';
import {
  AssignItemDto,
  CreateRequirementDto,
  RequirementItemDto,
  UpdateRequirementDto,
} from './dto';
import { RequirementItemStatus, RequirementStatus } from '../common/enums';

@Injectable()
export class RequirementsService {
  constructor(
    @InjectRepository(Requirement)
    private readonly repo: Repository<Requirement>,
    @InjectRepository(RequirementItem)
    private readonly itemRepo: Repository<RequirementItem>,
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const req = await this.repo.findOne({
      where: { id },
      relations: { quotations: true },
    });
    if (!req) throw new NotFoundException(`Requirement ${id} not found`);
    return req;
  }

  private buildItem(dto: RequirementItemDto): RequirementItem {
    const item = this.itemRepo.create({
      serviceType: dto.serviceType,
      description: dto.description,
      quantity: dto.quantity ?? 1,
      unit: dto.unit,
      assignedVendorId: dto.assignedVendorId,
      vendorCost: dto.vendorCost ?? 0,
      markup: dto.markup ?? 0,
      notes: dto.notes,
      status: dto.assignedVendorId
        ? RequirementItemStatus.ASSIGNED
        : RequirementItemStatus.PENDING,
    });
    return item;
  }

  async create(dto: CreateRequirementDto) {
    const req = this.repo.create({
      title: dto.title,
      description: dto.description,
      clientId: dto.clientId,
      status: RequirementStatus.NEW,
      items: (dto.items ?? []).map((i) => this.buildItem(i)),
    });
    const saved = await this.repo.save(req);
    // Generate a friendly reference once we have the id.
    saved.referenceNo = `REQ-${new Date().getFullYear()}-${String(saved.id).padStart(4, '0')}`;
    await this.repo.save(saved);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateRequirementDto) {
    const req = await this.findOne(id);
    if (dto.title !== undefined) req.title = dto.title;
    if (dto.description !== undefined) req.description = dto.description;
    if (dto.clientId !== undefined) req.clientId = dto.clientId;
    if (dto.status !== undefined) req.status = dto.status;

    // Full replace of items when provided.
    if (dto.items) {
      await this.itemRepo.delete({ requirementId: id });
      req.items = dto.items.map((i) => this.buildItem(i));
    }
    await this.repo.save(req);
    return this.findOne(id);
  }

  async remove(id: number) {
    const req = await this.findOne(id);
    await this.repo.remove(req);
    return { deleted: true, id };
  }

  // Assign a vendor and/or capture vendor cost + our markup for one work item.
  async assignItem(reqId: number, itemId: number, dto: AssignItemDto) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, requirementId: reqId },
    });
    if (!item)
      throw new NotFoundException(
        `Item ${itemId} not found on requirement ${reqId}`,
      );

    if (dto.assignedVendorId !== undefined) {
      item.assignedVendorId = dto.assignedVendorId;
      const vendor = await this.vendorRepo.findOne({
        where: { id: dto.assignedVendorId },
      });
      if (!vendor)
        throw new NotFoundException(`Vendor ${dto.assignedVendorId} not found`);
    }
    if (dto.vendorCost !== undefined) item.vendorCost = dto.vendorCost;
    if (dto.markup !== undefined) item.markup = dto.markup;

    // Derive item status.
    if (Number(item.vendorCost) > 0) {
      item.status = RequirementItemStatus.QUOTED;
    } else if (item.assignedVendorId) {
      item.status = RequirementItemStatus.ASSIGNED;
    } else {
      item.status = RequirementItemStatus.PENDING;
    }
    await this.itemRepo.save(item);

    // Roll requirement status forward based on items.
    await this.refreshStatus(reqId);
    return this.findOne(reqId);
  }

  // Move requirement status forward based on its items' progress, without
  // overriding the negotiation/accepted/invoiced states which are driven
  // elsewhere.
  private async refreshStatus(reqId: number) {
    const req = await this.findOne(reqId);
    const locked = [
      RequirementStatus.SENT_TO_CLIENT,
      RequirementStatus.NEGOTIATING,
      RequirementStatus.ACCEPTED,
      RequirementStatus.INVOICED,
      RequirementStatus.REJECTED,
      RequirementStatus.CLOSED,
    ];
    if (locked.includes(req.status)) return;

    const items = req.items ?? [];
    if (items.length === 0) {
      req.status = RequirementStatus.NEW;
    } else if (items.every((i) => Number(i.vendorCost) > 0)) {
      req.status = RequirementStatus.VENDOR_QUOTED;
    } else if (items.some((i) => i.assignedVendorId)) {
      req.status = RequirementStatus.ASSIGNED;
    } else {
      req.status = RequirementStatus.NEW;
    }
    await this.repo.save(req);
  }
}
