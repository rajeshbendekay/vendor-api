import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuPermission } from './menu-permission.entity';
import { MenuPermissionsService } from './menu-permissions.service';
import { MenuPermissionsController } from './menu-permissions.controller';
import { MenuPermissionSeedService } from './seed/menu-permission-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([MenuPermission])],
  controllers: [MenuPermissionsController],
  providers: [MenuPermissionsService, MenuPermissionSeedService],
  exports: [MenuPermissionsService],
})
export class MenuPermissionsModule {}
