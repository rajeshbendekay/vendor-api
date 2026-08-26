import { Body, Controller, Get, Patch } from '@nestjs/common';
import { MenuPermissionsService } from './menu-permissions.service';
import { UpdateMenuPermissionsDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/user-role.enum';

@Controller('menu-permissions')
export class MenuPermissionsController {
  constructor(private readonly service: MenuPermissionsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findGrid() {
    return this.service.findGrid();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  update(@Body() dto: UpdateMenuPermissionsDto) {
    return this.service.updateGrid(dto.entries);
  }

  // Any authenticated user (both roles) — drives what the frontend nav renders.
  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.service.findMine(user.roles as UserRole[]);
  }
}
