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
import { InvestmentsService } from './investments.service';
import {
  CreateInvestmentDto,
  CreatePartialSettlementDto,
  CreateWithdrawalDto,
  UpdateInvestmentDto,
  UpdateWithdrawalDto,
} from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/user-role.enum';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

  // For an INVESTOR-role caller, always force-scope to their own
  // investorId server-side — a client-supplied ?investorId= is ignored,
  // so it can't be used to read someone else's investments.
  @Get()
  findAll(@Query('investorId') investorId: string | undefined, @CurrentUser() user: AuthUser) {
    if (user.roles.includes(UserRole.INVESTOR)) {
      return this.service.findForInvestor(user.investorId as number);
    }
    if (investorId) return this.service.findForInvestor(Number(investorId));
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.findOneWithComputed(id, this.scopeFor(user));
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateInvestmentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvestmentDto) {
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
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.service.withdraw(id, dto);
  }

  @Post(':id/settle-profit')
  @Roles(UserRole.ADMIN)
  settleProfit(@Param('id', ParseIntPipe) id: number) {
    return this.service.settleProfit(id);
  }

  @Post(':id/settle-partial')
  @Roles(UserRole.ADMIN)
  settlePartial(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePartialSettlementDto,
  ) {
    return this.service.settlePartial(id, dto);
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
    @Body() dto: UpdateWithdrawalDto,
  ) {
    return this.service.updateWithdrawal(id, withdrawalId, dto);
  }

  private scopeFor(user: AuthUser): number | null {
    return user.roles.includes(UserRole.INVESTOR) ? (user.investorId as number) : null;
  }
}
