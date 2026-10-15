import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalculationsRepository } from './calculations.repository';
import { SurveyCalculationsEntity } from './survey-calculations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SurveyCalculationsEntity])],
  providers: [CalculationsRepository],
  exports: [CalculationsRepository],
})
export class CalculationsModule {}
