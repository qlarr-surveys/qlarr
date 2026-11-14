/** A job status from the backend that is still going. */
export const isActive = (status) => status === "waiting" || status === "running";

/**
 * Whether `GET survey/:id/jobs` reports a job of `kind` (on `subjectKey`,
 * when given) in progress or with results: what a save that invalidates it
 * would lose.
 */
export const hasJobAtStake = (jobs, kind, subjectKey) =>
  jobs.some(
    (job) =>
      job.kind === kind &&
      (subjectKey === undefined || job.subjectKey === subjectKey) &&
      (isActive(job.status) || job.hasResults)
  );
