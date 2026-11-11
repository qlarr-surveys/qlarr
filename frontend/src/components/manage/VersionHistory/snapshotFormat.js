import { serverDateTimeToLocalDateTime, timeAgo } from "~/utils/DateUtils";

/** Stands in for a snapshot id: the design as it is now. */
export const CURRENT_VERSION = "current";

/** "11/3/2026, 9:08:46 PM (5 minutes ago)" */
export function snapshotDate(savedAt, language) {
  const date = serverDateTimeToLocalDateTime(savedAt);
  return `${date.toLocaleString(language)} (${timeAgo(date, language)})`;
}
