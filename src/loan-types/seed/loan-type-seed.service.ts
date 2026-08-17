import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoanTypesService } from '../loan-types.service';

@Injectable()
export class LoanTypeSeedService implements OnModuleInit {
  constructor(private readonly service: LoanTypesService) {}

  async onModuleInit() {
    await this.service.seedDefaults();
  }
}
