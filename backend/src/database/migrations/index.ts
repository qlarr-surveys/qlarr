import { Baseline0000000000001 } from './1-Baseline';
import { Calculations0000000000002 } from './2-Calculations';
import { RefreshRotation0000000000003 } from './3-RefreshRotation';
import { DesignSnapshots0000000000004 } from './4-DesignSnapshots';
import { DropCalculationJobs0000000000005 } from './5-DropCalculationJobs';
import { Jobs0000000000006 } from './6-Jobs';
import { JobFailures0000000000007 } from './7-JobFailures';

/** Migrations applied to the database, in order. */
export const MIGRATIONS = [
  Baseline0000000000001,
  Calculations0000000000002,
  RefreshRotation0000000000003,
  DesignSnapshots0000000000004,
  DropCalculationJobs0000000000005,
  Jobs0000000000006,
  JobFailures0000000000007,
];
