import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Requirement } from './requirement.entity';
import { RequirementItem } from './requirement-item.entity';
import { Vendor } from '../vendors/vendor.entity';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Requirement, RequirementItem, Vendor])],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
