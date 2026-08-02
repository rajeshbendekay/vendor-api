import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/guards/jwt-auth.guard';

// Self-service profile — deliberately has no @Roles() restriction, so both
// ADMIN and INVESTOR accounts can view/update their own basic details and
// login password (unlike /users and /investors, which are admin-only
// management of *other* accounts).
@Controller('profile')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.service.me(user);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.service.update(user, dto);
  }
}
