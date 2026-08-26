import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users.service';
import { UserRole } from '../user-role.enum';

// Runs on every boot; a no-op once an admin exists. Self-healing bootstrap
// path so there's always a way to log in without a manual seed script.
@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const hasAdmin = await this.usersService.existsByRole(UserRole.ADMIN);
    if (hasAdmin) return;

    const phone = this.config.get<string>('ADMIN_PHONE');
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!password || (!phone && !email)) {
      this.logger.warn(
        'No admin account exists and ADMIN_PHONE/ADMIN_EMAIL/ADMIN_PASSWORD are not set — skipping bootstrap. Set these env vars and restart to create the initial admin.',
      );
      return;
    }

    await this.usersService.createRaw({
      name: 'Admin',
      phone: phone ?? null,
      email: email ?? null,
      password,
      roles: [UserRole.ADMIN],
    });
    this.logger.log('Initial admin account created from ADMIN_* env vars.');
  }
}
