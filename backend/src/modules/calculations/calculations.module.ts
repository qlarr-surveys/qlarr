import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignModule } from '../design/design.module';
import { CalculationsController } from './calculations.controller';
import { CalculationsRepository } from './calculations.repository';
import { CalculationsService } from './calculations.service';
import { SurveyCalculationsEntity } from './survey-calculations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyCalculationsEntity]), DesignModule],
  controllers: [CalculationsController],
  providers: [CalculationsRepository, CalculationsService],
  // The repository is shared with SurveysModule (clone/import/export) and
  // ResponsesModule (response review and exports).
  exports: [CalculationsRepository],
})
export class CalculationsModule {}
