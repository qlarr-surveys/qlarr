import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesystemModule } from '../../integrations/filesystem/filesystem.module';
import { DesignModule } from '../design/design.module';
import { ResponsesModule } from '../responses/responses.module';
import { NavigationService } from './navigation.service';
import { RunController } from './run.controller';
import { RunService } from './run.service';
import { SurveyResponseEntity } from './survey-response.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurveyResponseEntity]),
    DesignModule,
    FilesystemModule,
    ResponsesModule,
  ],
  controllers: [RunController],
  providers: [RunService, NavigationService],
})
export class RunModule {}
