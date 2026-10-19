import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesystemModule } from '../../integrations/filesystem/filesystem.module';
import { SurveyEntity } from '../surveys/survey.entity';
import { VersionEntity } from '../surveys/version.entity';
import { DesignSnapshotEntity } from './design-snapshot.entity';
import { DesignSnapshotService } from './design-snapshot.service';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';
import { QuotaService } from './quota.service';
import { VersionRepository } from './version.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurveyEntity, VersionEntity, DesignSnapshotEntity]),
    FilesystemModule,
  ],
  controllers: [DesignController],
  providers: [
    DesignService,
    DesignSnapshotService,
    QuotaService,
    VersionRepository,
  ],
  // VersionRepository is exported so SurveysService (SurveysModule imports
  // DesignModule) shares the single home for `versions` table access.
  exports: [DesignService, QuotaService, VersionRepository],
})
export class DesignModule {}
