import { HttpStatus } from '@nestjs/common';
import {
  ResumeNotAllowedException,
  SurveyExpiredException,
  SurveyNotStartedException,
  SurveyQuotaExceededException,
} from '../src/modules/run/run.exceptions';

/**
 * Survey-availability errors must be handled by the error handler:
 * 404 (not the generic 400) and the original message strings — including the
 * start date carried in SurveyNotStartedException.
 */
describe('run survey-availability exceptions (Kotlin parity)', () => {
  it('SurveyNotStartedException → 404 with the interpolated start date', () => {
    const ex = new SurveyNotStartedException('2099-01-01T00:00:00Z');
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(ex.getResponse()).toEqual({
      message: 'This survey has not started yet, it starts on 2099-01-01T00:00:00Z',
      error: 'SurveyNotStartedException',
    });
  });

  it('SurveyExpiredException → 404 with the Kotlin message', () => {
    const ex = new SurveyExpiredException();
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(ex.getResponse()).toEqual({
      message: 'Invalid input, survey end date must always be before start date',
      error: 'SurveyExpiredException',
    });
  });

  it('SurveyQuotaExceededException → 404, error name "SurveyQuotaExceeded"', () => {
    const ex = new SurveyQuotaExceededException();
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(ex.getResponse()).toEqual({
      message: 'Survey Quota Exceeded',
      error: 'SurveyQuotaExceeded',
    });
  });

  it('other run errors keep the 400 default', () => {
    expect(new ResumeNotAllowedException().getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });
});
