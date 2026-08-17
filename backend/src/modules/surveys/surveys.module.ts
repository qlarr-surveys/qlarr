import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesystemModule } from '../../integrations/filesystem/filesystem.module';
import { DesignModule } from '../design/design.module';
import {
  AutoCompleteAdminController,
  AutoCompleteController,
} from './autocomplete.controller';
import { AutoCompleteService } from './autocomplete.service';
import { AutoCompleteRepository } from './autocomplete.repository';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { SurveyDashboardService } from './dashboard.service';
import { SurveyController } from './survey.controller';
import { SurveyCreateController } from './survey-create.controller';
import { SurveyEntity } from './survey.entity';
import { SurveyResourceController } from './survey-resource.controller';
import { SurveyRepository } from './survey.repository';
import { SurveyResourceService } from './survey-resource.service';
import { SurveysService } from './surveys.service';
import { VersionEntity } from './version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurveyEntity, VersionEntity]),
    FilesystemModule,
    DesignModule,
  ],
  // Static/specific routes register before SurveyController's /survey/:surveyId
  // so they aren't captured as a (non-UUID) surveyId: DashboardController
  // (/survey/all, /survey/offline), SurveyCreateController (/survey/create).
  controllers: [
    DashboardController,
    SurveyCreateController,
    SurveyController,
    SurveyResourceController,
    AutoCompleteController,
    AutoCompleteAdminController,
  ],
  providers: [
    SurveysService,
    SurveyRepository,
    SurveyDashboardService,
    DashboardRepository,
    SurveyResourceService,
    AutoCompleteService,
    AutoCompleteRepository,
  ],
})
export class SurveysModule {}
