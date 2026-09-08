import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { AnalyticsDto } from './analytics.dto';
import { AnalyticsService, DEFAULT_MAX_RESPONSES } from './analytics.service';
import {
  CrosstabCatalogueDto,
  CrosstabRequestDto,
  CrosstabResultDto,
} from './crosstab.dto';
import { CrosstabService } from './crosstab.service';
import { responseStatusFrom, ResponsesSummaryDto } from './response.dto';
import {
  exportContentType,
  responseFormatFrom,
} from './response-export';
import { ResponseService } from './response.service';

const toInt = (v?: string): number | undefined => {
  if (v == null) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
};

const toBool = (v?: string): boolean | undefined =>
  v == null ? undefined : v === 'true';


/**
 * Response list + delete (engine-independent subset). Both require survey
 * permission; the list is open to analysts too, delete is admin-only.
 */
@Controller('survey')
export class ResponseController {
  constructor(
    private readonly responses: ResponseService,
    private readonly analytics: AnalyticsService,
    private readonly crosstab: CrosstabService,
  ) {}

  @Get(':surveyId/response/analytics')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  getAnalytics(
    @Param('surveyId') surveyId: string,
    @Query('max_responses') maxResponses?: string,
  ): Promise<AnalyticsDto> {
    return this.analytics.getAnalytics(
      surveyId,
      toInt(maxResponses) ?? DEFAULT_MAX_RESPONSES,
    );
  }

  @Get(':surveyId/response/crosstab-catalogue')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  getCrosstabCatalogue(
    @Param('surveyId') surveyId: string,
  ): Promise<CrosstabCatalogueDto> {
    return this.crosstab.getCatalogue(surveyId);
  }

  @Post(':surveyId/response/crosstab')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  getCrosstab(
    @Param('surveyId') surveyId: string,
    @Body() config: CrosstabRequestDto,
  ): Promise<CrosstabResultDto> {
    return this.crosstab.tabulate(surveyId, config);
  }

  @Get(':surveyId/response/summary')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  getSummary(
    @Param('surveyId') surveyId: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('status') status?: string,
    @Query('surveyor') surveyor?: string,
    @Query('confirm_files_export') confirmFilesExport?: string,
  ): Promise<ResponsesSummaryDto> {
    return this.responses.getSummary(
      surveyId,
      toInt(page),
      toInt(perPage),
      responseStatusFrom(status),
      surveyor || undefined,
      toBool(confirmFilesExport) ?? false,
    );
  }

  @Get(':surveyId/response/export/:format/:from/:to')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  async exportResponses(
    @Param('surveyId') surveyId: string,
    @Param('format') format: string,
    @Param('from') from: string,
    @Param('to') to: string,
    @Query('complete') complete: string | undefined,
    @Query('db_values') dbValues: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const fmt = responseFormatFrom(format);
    // db_values=false → the human-readable text export (labels + masked values);
    // anything else (default/true) → the raw DB-value export.
    const args = [surveyId, toBool(complete), fmt, toInt(from) ?? 0, toInt(to) ?? 0] as const;
    const buffer =
      toBool(dbValues) === false
        ? await this.responses.exportTextResponses(...args)
        : await this.responses.exportResponses(...args);
    if (!buffer) {
      res.status(204).end();
      return;
    }
    res.setHeader('Content-Type', exportContentType(fmt));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${surveyId}-responses-export.${fmt.toLowerCase()}"`,
    );
    res.send(buffer);
  }

  @Get(':surveyId/response/files/download/:from/:to')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN, Role.ANALYST)
  async bulkDownload(
    @Param('surveyId') surveyId: string,
    @Param('from') from: string,
    @Param('to') to: string,
    @Query('complete') complete: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const zip = await this.responses.bulkDownloadResponses(
      surveyId,
      toBool(complete),
      toInt(from) ?? 0,
      toInt(to) ?? 0,
    );
    if (!zip) {
      res.status(204).end();
      return;
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${surveyId}-responses-files.zip"`,
    );
    // pipe() does not forward errors: if the zip stream fails, tear the
    // response down instead of leaving the socket hanging.
    zip.on('error', () => res.destroy());
    // If the client disconnects mid-download, destroy the zip stream so the
    // service stops fetching from S3 instead of leaking the in-flight body.
    res.on('close', () => zip.destroy());
    zip.pipe(res);
  }

  @Delete(':surveyId/response/:responseId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @HttpCode(204)
  delete(
    @Param('surveyId') surveyId: string,
    @Param('responseId') responseId: string,
  ): Promise<void> {
    return this.responses.deleteResponse(surveyId, responseId);
  }
}
