import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DbContext } from '../database/db-context';
import { Job } from './job-handler';

/**
 * Runs one DB step of a job. Here, on the default manager. A provider, so a
 * deployment can run a job's steps elsewhere. A step never spans an engine
 * call, so a job holds no connection while it computes.
 */
@Injectable()
export class JobContext {
  constructor(private readonly db: DbContext) {}

  run<T>(_job: Job, work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return work(this.db.manager);
  }
}
