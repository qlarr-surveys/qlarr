import { registerAs } from '@nestjs/config';

export interface JobsConfig {
  /** Whether this process runs jobs. */
  worker: boolean;
  /** Jobs of each kind this process runs at the same time. */
  slots: number;
}

/** Long-running jobs. Defaults are set in env.validation. */
export default registerAs(
  'jobs',
  (): JobsConfig => ({
    worker: process.env.JOBS_WORKER !== 'false',
    slots: parseInt(process.env.JOB_SLOTS ?? '2', 10),
  }),
);
