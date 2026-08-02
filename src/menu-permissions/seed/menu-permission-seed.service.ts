import { Injectable, OnModuleInit } from '@nestjs/common';
import { MenuPermissionsService } from '../menu-permissions.service';

@Injectable()
export class MenuPermissionSeedService implements OnModuleInit {
  constructor(private readonly service: MenuPermissionsService) {}

  async onModuleInit() {
    await this.service.seedDefaults();
  }
}
