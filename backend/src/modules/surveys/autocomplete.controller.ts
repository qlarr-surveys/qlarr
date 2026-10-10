import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public } from '../../auth/public.decorator';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { MAX_UPLOAD_BYTES, uploadLimits } from '../../common/upload';
import {
  AutoCompleteFileInfo,
  HierarchicalAutoCompleteFileInfo,
} from '../../integrations/filesystem/file-info';
import { AutoCompleteService } from './autocomplete.service';
import { HierarchicalRow } from './hierarchical-autocomplete-csv';
import { SurveyResourceService } from './survey-resource.service';

/** Uploaded file shape from Multer's memory storage. */
interface UploadedResource {
  originalname: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

@Controller('survey')
export class AutoCompleteController {
  constructor(private readonly autocomplete: AutoCompleteService) {}

  // Public respondent-facing search. Tenant comes from the surveyId in the path.
  @Public()
  @Get(':surveyId/autocomplete/:filename')
  search(
    @Param('surveyId') surveyId: string,
    @Param('filename') filename: string,
    @Query('q') q = '',
    @Query('limit') limit = '10',
  ): Promise<string[]> {
    const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    return this.autocomplete.search(surveyId, filename, q, n);
  }

  // Public respondent-facing search for one level of a hierarchical
  // autocomplete. `prefix` is a JSON array of the values selected for the
  // levels above (in the search language); `level` is 0-based.
  @Public()
  @Get(':surveyId/hierarchical-autocomplete/:filename')
  searchHierarchical(
    @Param('surveyId') surveyId: string,
    @Param('filename') filename: string,
    @Query('level') level: string,
    @Query('prefix') prefix: string,
    @Query('q') q = '',
    @Query('lang') lang: string,
    @Query('defaultLang') defaultLang: string,
    @Query('limit') limit = '10',
  ): Promise<string[]> {
    const levelIndex = parseInt(level, 10);
    if (!Number.isInteger(levelIndex) || levelIndex < 0) {
      throw new BadRequestException('level must be a non-negative integer');
    }
    const prefixValues = parseStringArray(prefix ?? '[]', 'prefix');
    if (prefixValues.length !== levelIndex) {
      throw new BadRequestException('prefix must hold one value per level above');
    }
    const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    return this.autocomplete.searchHierarchical(
      surveyId,
      filename,
      levelIndex,
      prefixValues,
      q,
      requireLang(lang, 'lang'),
      requireLang(defaultLang, 'defaultLang'),
      n,
    );
  }

  // Public: the whole row (every language) for a fully selected path. The
  // respondent UI uses it to turn the stored default-language values into the
  // respondent's language, and to get the default-language values for a path
  // picked in the respondent's language.
  @Public()
  @Get(':surveyId/hierarchical-autocomplete/:filename/row')
  async hierarchicalRow(
    @Param('surveyId') surveyId: string,
    @Param('filename') filename: string,
    @Query('path') path: string,
    @Query('lang') lang: string,
    @Query('defaultLang') defaultLang: string,
  ): Promise<HierarchicalRow> {
    const row = await this.autocomplete.hierarchicalRow(
      surveyId,
      filename,
      parseStringArray(path, 'path'),
      requireLang(lang, 'lang'),
      requireLang(defaultLang, 'defaultLang'),
    );
    if (!row) throw new NotFoundException();
    return row;
  }
}

function parseStringArray(raw: string, name: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException(`${name} must be a JSON array of strings`);
  }
  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === 'string')) {
    throw new BadRequestException(`${name} must be a JSON array of strings`);
  }
  return parsed;
}

function requireLang(lang: string, name: string): string {
  if (!lang) throw new BadRequestException(`${name} is required`);
  return lang;
}

/**
 * Design-time management for both `autocomplete` and `hierarchical-autocomplete`
 * components. Top-level routes (not under `/survey`), admin-only + survey
 * permission. One controller, no shared base path — each method carries its full
 * path so the two resource families live together.
 *
 * - autocomplete: read a component's stored values, or upload a new value list.
 * - hierarchical-autocomplete: upload the rows CSV (replacing the stored data),
 *   or download it. The canonical data lives in the same `auto_complete` table
 *   (array of per-language objects).
 */
@Controller()
export class AutoCompleteAdminController {
  constructor(
    private readonly autocomplete: AutoCompleteService,
    private readonly resources: SurveyResourceService,
  ) {}

  @Get('autocomplete/:surveyId/:componentId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  getValues(
    @Param('surveyId') surveyId: string,
    @Param('componentId') componentId: string,
  ): Promise<string[]> {
    return this.autocomplete.getAutoCompleteValues(surveyId, componentId);
  }

  @Post('autocomplete/:surveyId/:componentId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @UseInterceptors(FileInterceptor('file', uploadLimits(MAX_UPLOAD_BYTES)))
  upload(
    @Param('surveyId') surveyId: string,
    @Param('componentId') componentId: string,
    @UploadedFile() file: UploadedResource,
  ): Promise<AutoCompleteFileInfo> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.resources.uploadAutoCompleteResource(surveyId, componentId, file);
  }

  @Post('hierarchical-autocomplete/:surveyId/:componentId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  uploadHierarchical(
    @Param('surveyId') surveyId: string,
    @Param('componentId') componentId: string,
    @Query('levels') levels: string,
    @UploadedFile() file: UploadedResource,
  ): Promise<HierarchicalAutoCompleteFileInfo> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const levelCount = parseInt(levels, 10);
    if (!Number.isInteger(levelCount) || levelCount < 1) {
      throw new BadRequestException('levels must be a positive integer');
    }
    return this.autocomplete.uploadHierarchical(
      surveyId,
      componentId,
      levelCount,
      file,
    );
  }

  @Get('hierarchical-autocomplete/:surveyId/:componentId')
  @Roles(Role.SUPER_ADMIN, Role.SURVEY_ADMIN)
  async downloadHierarchical(
    @Param('surveyId') surveyId: string,
    @Param('componentId') componentId: string,
    @Query('langs') langs: string,
    @Query('labels') labels: string,
    @Res() res: Response,
  ): Promise<void> {
    // The survey's languages, so every one is emitted as a (possibly empty)
    // column — a ready-to-fill template — and the level names for the headers.
    const languages = langs
      ? langs.split(',').map((l) => l.trim()).filter(Boolean)
      : [];
    let levelLabels: string[] = [];
    try {
      const parsed: unknown = labels ? JSON.parse(labels) : [];
      if (Array.isArray(parsed)) levelLabels = parsed.map((l) => String(l));
    } catch {
      // ignore malformed labels — headers fall back to "Level N"
    }
    const csv = await this.autocomplete.getHierarchicalCsv(
      surveyId,
      componentId,
      languages,
      levelLabels,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="hierarchical-data.csv"',
    );
    res.send(csv);
  }
}
