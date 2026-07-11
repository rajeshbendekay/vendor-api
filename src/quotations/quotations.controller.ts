import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { GenerateQuotationDto, RequestRevisionDto } from './dto';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly service: QuotationsService) {}

  @Get()
  findForRequirement(@Query('requirementId', ParseIntPipe) requirementId: number) {
    return this.service.findForRequirement(requirementId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // Generate a new quotation revision from a requirement's current item costs.
  @Post('generate/:requirementId')
  generate(
    @Param('requirementId', ParseIntPipe) requirementId: number,
    @Body() dto: GenerateQuotationDto,
  ) {
    return this.service.generate(requirementId, dto);
  }

  @Post(':id/send')
  send(@Param('id', ParseIntPipe) id: number) {
    return this.service.send(id);
  }

  @Post(':id/request-revision')
  requestRevision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.service.requestRevision(id, dto);
  }

  @Post(':id/accept')
  accept(@Param('id', ParseIntPipe) id: number) {
    return this.service.accept(id);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.service.reject(id);
  }
}
