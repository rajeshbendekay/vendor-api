import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AddUserRolesDto, CreateUserDto, UpdateUserDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './user-role.enum';

// Admin-only account management screen — also the single onboarding entry
// point: POST /users creates a login with one or more roles at once
// (ADMIN/INVESTOR/RETURN_PARTY), creating the linked Investor/ReturnParty
// KYC row(s) as needed (see users.service.ts).
@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  // Adds roles onto an existing login — add-only (see UsersService.addRoles).
  @Patch(':id/roles')
  addRoles(@Param('id', ParseIntPipe) id: number, @Body() dto: AddUserRolesDto) {
    return this.service.addRoles(id, dto);
  }
}
