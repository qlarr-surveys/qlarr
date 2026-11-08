/** A job status from the backend that is still going. */
export const isActive = (status) => status === "waiting" || status === "running";

/**
 * Whether `GET survey/:id/jobs` reports a Compute in progress or computed
 * results: what a calculations Save or a design edit would lose.
 */
export const hasComputeAtStake = (jobs) =>
  jobs.some(
    (job) =>
      job.kind === "calc.compute" && (isActive(job.status) || job.hasResults)
  );
