import { registerAs } from '@nestjs/config';

export interface SnapshotsConfig {
  intervalMs: number;
}

export default registerAs(
  'snapshots',
  (): SnapshotsConfig => ({
    intervalMs: parseInt(process.env.DESIGN_SNAPSHOT_INTERVAL_MS!, 10),
  }),
);
