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
import { InvestorsService } from './investors.service';
import { CreateInvestorDto, UpdateInvestorDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/user-role.enum';

@Controller('investors')
export class InvestorsController {
  constructor(private readonly service: InvestorsService) {}

  // Both roles can call this — an INVESTOR only ever gets their own record.
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    if (user.roles.includes(UserRole.INVESTOR)) {
      return this.service.findAllForInvestor(user.investorId as number);
    }
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    if (user.roles.includes(UserRole.INVESTOR)) {
      return this.service.findOneForInvestor(id, user.investorId as number);
    }
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateInvestorDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvestorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
