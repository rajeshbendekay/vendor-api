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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { PaymentMode } from './expense.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/guards/jwt-auth.guard';

const attachmentStorage = diskStorage({
  destination: 'uploads/expenses',
  filename: (_req, file, cb) => cb(null, `${randomUUID()}-${file.originalname}`),
});

@Controller('expenses')
@Roles(UserRole.ADMIN)
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.service.findAll({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      expenseTypeId: query.expenseTypeId ? Number(query.expenseTypeId) : undefined,
      paymentMode: query.paymentMode as PaymentMode | undefined,
      minAmount: query.minAmount ? Number(query.minAmount) : undefined,
      maxAmount: query.maxAmount ? Number(query.maxAmount) : undefined,
      keyword: query.keyword,
      sortBy: query.sortBy as 'date' | 'amount' | undefined,
      sortDir: query.sortDir as 'ASC' | 'DESC' | undefined,
    });
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/attachment')
  async attachment(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { path: filePath, originalName } =
      await this.service.getAttachment(id);
    res.download(filePath, originalName);
  }

  @Post()
  @UseInterceptors(FileInterceptor('attachment', { storage: attachmentStorage }))
  create(
    @Body() dto: CreateExpenseDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, file, user.id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('attachment', { storage: attachmentStorage }))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, file, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
