import { Module } from '@nestjs/common';
import { FilesystemModule } from '../../integrations/filesystem/filesystem.module';
import { DesignModule } from '../design/design.module';
import { AnalyticsService } from './analytics.service';
import { CrosstabService } from './crosstab.service';
import { ResponseController } from './response.controller';
import { ResponseOpsController } from './response-ops.controller';
import { ResponseOpsService } from './response-ops.service';
import { ResponseReadController } from './response-read.controller';
import { ResponseRepository } from './response.repository';
import { ResponseService } from './response.service';

@Module({
  imports: [FilesystemModule, DesignModule],
  controllers: [ResponseController, ResponseOpsController, ResponseReadController],
  providers: [
    ResponseService,
    ResponseOpsService,
    ResponseRepository,
    AnalyticsService,
    CrosstabService,
  ],
  // Exported so RunModule's NavigationService / RunService share the single
  // home for `responses` table access.
  exports: [ResponseRepository],
})
export class ResponsesModule {}
