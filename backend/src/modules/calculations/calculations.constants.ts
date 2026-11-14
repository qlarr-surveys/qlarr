/** At most this many calculations per survey (save DTO, UI and import). */
export const MAX_CALCULATIONS = 10;

/** Expressions longer than this are rejected (save DTO, UI) or dropped (import). */
export const MAX_EXPRESSION_LENGTH = 500;

/** The Compute job's kind. */
export const CALC_COMPUTE = 'calc.compute';

/** A Compute job fails once it has been running this long. */
export const COMPUTE_TIME_LIMIT_SECONDS = 120;

/** At most this many responses per Compute job; the next Compute runs the rest. */
export const MAX_RESPONSES_PER_JOB = 50_000;

/** A Compute job fails once more than this many of its responses failed. */
export const MAX_COMPUTE_FAILURES = 50;

/** Responses per engine call in a Compute job. */
export const COMPUTE_CHUNK_SIZE = 200;

/** Responses evaluated by Test and by the sample returned on save. */
export const SAMPLE_SIZE = 10;
