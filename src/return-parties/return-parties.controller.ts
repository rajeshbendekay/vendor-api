import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ReturnPartiesService } from './return-parties.service';
import { CreateReturnPartyDto, UpdateReturnPartyDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/user-role.enum';

@Controller('return-parties')
export class ReturnPartiesController {
  constructor(private readonly service: ReturnPartiesService) {}

  // Both roles can call this — a RETURN_PARTY only ever gets their own record.
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    if (user.role === UserRole.RETURN_PARTY) {
      return this.service.findAllForReturnParty(user.returnPartyId as number);
    }
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    if (user.role === UserRole.RETURN_PARTY) {
      return this.service.findOneForReturnParty(id, user.returnPartyId as number);
    }
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateReturnPartyDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReturnPartyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
