import { fDate } from "~/utils/format-time";
import { serverDateTimeToLocalDateTime } from "~/utils/DateUtils";
import { STATUS } from "./status";

/**
 * Every date the survey payload carries -- creationDate, lastModified,
 * startDate, endDate -- is a UTC wall clock with no zone on it
 * ("2026-10-22 01:30:00"), so it has to be read as UTC before it is
 * formatted. Handing it straight to dayjs reads it as local time instead,
 * which names the wrong day for every survey whose UTC time of day falls
 * before the viewer's offset.
 */
export const fLocal = (serverDate) =>
  serverDate ? fDate(serverDateTimeToLocalDateTime(serverDate)) : "";

// Which date a status is actually waiting on: a survey that has not started
// yet is read for when it starts, one that is collecting for when it stops.
// These are the conditions the card carried before the redesign, where the
// same two sets chose between a start and an end date.
const SHOWS_START = [STATUS.DRAFT, STATUS.SCHEDULED, STATUS.CLOSED];
const SHOWS_END = [STATUS.ACTIVE, STATUS.EXPIRED];

/**
 * The one date the card's stat slot shows, and the label it goes under.
 *
 * The slot used to be the creation date on every card, which left a
 * scheduled survey with nowhere on the card that said when it starts -- only
 * the status pill's tooltip did. Created stays as the fallback for a survey
 * with no date in the direction its status looks: an active survey that never
 * got an end date, or a draft with no start date yet.
 *
 * A scheduled survey always has a start date and an expired one always has an
 * end date -- that is how those two statuses are derived -- so neither ever
 * falls back.
 */
export const cardDate = (survey, surveyStatus) => {
  if (SHOWS_START.includes(surveyStatus) && survey.startDate) {
    return { labelKey: "edit_survey.metadata.start_date", value: survey.startDate };
  }
  if (SHOWS_END.includes(surveyStatus) && survey.endDate) {
    return { labelKey: "edit_survey.metadata.end_date", value: survey.endDate };
  }
  return { labelKey: "edit_survey.metadata.created", value: survey.creationDate };
};
