import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import {
  CreateReturnDto,
  CreateReturnWithdrawalDto,
  UpdateReturnDto,
  UpdateReturnWithdrawalDto,
} from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/user-role.enum';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  // For a RETURN_PARTY-role caller, always force-scope to their own
  // returnPartyId server-side — a client-supplied ?returnPartyId= is
  // ignored, so it can't be used to read someone else's returns.
  @Get()
  findAll(
    @Query('returnPartyId') returnPartyId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.roles.includes(UserRole.RETURN_PARTY)) {
      return this.service.findForReturnParty(user.returnPartyId as number);
    }
    if (returnPartyId) return this.service.findForReturnParty(Number(returnPartyId));
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.findOneWithComputed(id, this.scopeFor(user));
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateReturnDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReturnDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/withdrawals')
  @Roles(UserRole.ADMIN)
  withdraw(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReturnWithdrawalDto,
  ) {
    return this.service.withdraw(id, dto);
  }

  @Post(':id/settle-profit')
  @Roles(UserRole.ADMIN)
  settleProfit(@Param('id', ParseIntPipe) id: number) {
    return this.service.settleProfit(id);
  }

  @Get(':id/withdrawals')
  findWithdrawals(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.findWithdrawals(id, this.scopeFor(user));
  }

  @Patch(':id/withdrawals/:withdrawalId')
  @Roles(UserRole.ADMIN)
  updateWithdrawal(
    @Param('id', ParseIntPipe) id: number,
    @Param('withdrawalId', ParseIntPipe) withdrawalId: number,
    @Body() dto: UpdateReturnWithdrawalDto,
  ) {
    return this.service.updateWithdrawal(id, withdrawalId, dto);
  }

  private scopeFor(user: AuthUser): number | null {
    return user.roles.includes(UserRole.RETURN_PARTY) ? (user.returnPartyId as number) : null;
  }
}
