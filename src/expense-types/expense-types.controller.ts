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
import { ExpenseTypesService } from './expense-types.service';
import { CreateExpenseTypeDto, UpdateExpenseTypeDto } from './dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller('expense-types')
@Roles(UserRole.ADMIN)
export class ExpenseTypesController {
  constructor(private readonly service: ExpenseTypesService) {}

  @Get()
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.service.findAll(activeOnly === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExpenseTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseTypeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
