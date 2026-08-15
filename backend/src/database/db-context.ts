import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Accessor for the `EntityManager`. Services get their repositories/queries
 * through `manager` so data access stays decoupled from how the connection is
 * set up.
 *
 * This is the neutral DB seam: shared feature code depends only on `DbContext`,
 * never on how the manager is resolved. Here it returns the default DataSource
 * manager (single database, single schema).
 */
@Injectable()
export class DbContext {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  get manager(): EntityManager {
    return this.dataSource.manager;
  }
}
