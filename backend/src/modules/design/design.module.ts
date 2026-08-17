import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesystemModule } from '../../integrations/filesystem/filesystem.module';
import { SurveyEntity } from '../surveys/survey.entity';
import { VersionEntity } from '../surveys/version.entity';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';
import { VersionRepository } from './version.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurveyEntity, VersionEntity]),
    FilesystemModule,
  ],
  controllers: [DesignController],
  providers: [DesignService, VersionRepository],
  // VersionRepository is exported so SurveysService (SurveysModule imports
  // DesignModule) shares the single home for `versions` table access.
  exports: [DesignService, VersionRepository],
})
export class DesignModule {}
