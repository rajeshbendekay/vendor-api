import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../vendors/vendor.entity';
import { Client } from '../clients/client.entity';
import { Requirement } from '../requirements/requirement.entity';
import { Invoice } from '../invoices/invoice.entity';
import { RequirementStatus } from '../common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('dashboard')
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(
    @InjectRepository(Vendor) private vendors: Repository<Vendor>,
    @InjectRepository(Client) private clients: Repository<Client>,
    @InjectRepository(Requirement) private requirements: Repository<Requirement>,
    @InjectRepository(Invoice) private invoices: Repository<Invoice>,
  ) {}

  @Get('stats')
  async stats() {
    const [vendorCount, clientCount, requirements, invoices] =
      await Promise.all([
        this.vendors.count(),
        this.clients.count(),
        this.requirements.find(),
        this.invoices.find(),
      ]);

    const byStatus: Record<string, number> = {};
    for (const s of Object.values(RequirementStatus)) byStatus[s] = 0;
    for (const r of requirements) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

    const totalInvoiced = invoices.reduce(
      (sum, i) => sum + Number(i.totalAmount),
      0,
    );

    return {
      vendorCount,
      clientCount,
      requirementCount: requirements.length,
      invoiceCount: invoices.length,
      totalInvoiced,
      requirementsByStatus: byStatus,
      openRequirements: requirements.filter(
        (r) =>
          ![
            RequirementStatus.INVOICED,
            RequirementStatus.REJECTED,
            RequirementStatus.CLOSED,
          ].includes(r.status),
      ).length,
    };
  }
}
