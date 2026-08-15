import { Injectable } from '@nestjs/common';
import {
  OfflineSurveyDto,
  SimpleSurveyDto,
  SurveysDto,
  parseSurveyFilter,
  parseSurveySort,
} from './survey.dto';
import { DashboardRepository } from './dashboard.repository';
import {
  RawVersion,
  offlineSurveyFromRow,
  simpleSurveyFromRow,
} from './survey.mapper';

const DEFAULT_PER_PAGE = 5;

/**
 * Port of SurveyDashboardService. The survey/version/response joins live in
 * DashboardRepository; this service parses the filter/sort/paging inputs and
 * maps the raw rows into DTOs.
 */
@Injectable()
export class SurveyDashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  async getAllSurveys(
    page: number | undefined,
    perPage: number | undefined,
    sortBy: string | undefined,
    status: string | undefined,
  ): Promise<SurveysDto> {
    const sort = parseSurveySort(sortBy);
    const filter = parseSurveyFilter(status);
    const size = perPage ?? DEFAULT_PER_PAGE;
    const zeroBasedPage = Math.max(0, (page ?? 1) - 1);
    const offset = zeroBasedPage * size;

    const totalCount = await this.dashboard.countSurveys(filter);
    const rows = await this.dashboard.pageSurveys(filter, sort, size, offset);

    const surveys: SimpleSurveyDto[] = rows.map((row) =>
      simpleSurveyFromRow(
        row.survey,
        row.version,
        Number(row.response_count),
        Number(row.complete_count),
      ),
    );

    return {
      totalCount,
      totalPages: size > 0 ? Math.ceil(totalCount / size) : 0,
      pageNumber: zeroBasedPage,
      surveys,
    };
  }

  async surveysForOffline(userId: string): Promise<OfflineSurveyDto[]> {
    const rows = await this.dashboard.offlineSurveys(userId);

    // An ACTIVE survey always has a published version, but guard the LEFT JOIN
    // null defensively rather than 500 on the (shouldn't-happen) row.
    return rows
      .filter((row) => row.version != null)
      .map((row) =>
        offlineSurveyFromRow(
          row.survey,
          row.version as RawVersion,
          Number(row.complete_count ?? 0),
          Number(row.user_response_count ?? 0),
        ),
      );
  }
}
