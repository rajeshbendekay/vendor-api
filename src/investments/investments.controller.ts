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
import { CreateInvestmentDto, CreateWithdrawalDto, UpdateInvestmentDto } from './dto';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

  @Get()
  findAll(@Query('investorId') investorId?: string) {
    if (investorId) return this.service.findForInvestor(Number(investorId));
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneWithComputed(id);
  }

  @Post()
  create(@Body() dto: CreateInvestmentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvestmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/withdrawals')
  withdraw(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.service.withdraw(id, dto);
  }

  @Get(':id/withdrawals')
  findWithdrawals(@Param('id', ParseIntPipe) id: number) {
    return this.service.findWithdrawals(id);
  }

  @Delete(':id/withdrawals/:withdrawalId')
  removeWithdrawal(
    @Param('id', ParseIntPipe) id: number,
    @Param('withdrawalId', ParseIntPipe) withdrawalId: number,
  ) {
    return this.service.removeWithdrawal(id, withdrawalId);
  }
}
