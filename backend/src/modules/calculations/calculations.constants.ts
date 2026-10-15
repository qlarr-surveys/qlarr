/** At most this many calculations per survey (save DTO, UI and import). */
export const MAX_CALCULATIONS = 10;

/** Expressions longer than this are rejected (save DTO, UI) or dropped (import). */
export const MAX_EXPRESSION_LENGTH = 500;

/** A Compute run fails once it has been running this long, regardless. */
export const RUN_TIME_LIMIT_SECONDS = 120;
