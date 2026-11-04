import { serverDateTimeToLocalDateTime, timeAgo } from "~/utils/DateUtils";

/** "11/3/2026, 9:08:46 PM (5 minutes ago)" */
export function snapshotDate(savedAt, language) {
  const date = serverDateTimeToLocalDateTime(savedAt);
  return `${date.toLocaleString(language)} (${timeAgo(date, language)})`;
}
