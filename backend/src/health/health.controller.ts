import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Liveness — the app is up and serving HTTP. */
  @Public()
  @Get()
  health() {
    return { status: 'ok', service: 'qlarr-backend', phase: 0 };
  }

  /**
   * Readiness — proves the app can reach the existing Postgres. Returns only a
   * reachability boolean; it must NOT leak the Postgres build string (this is a
   * @Public endpoint), so it selects a constant rather than version().
   */
  @Public()
  @Get('db')
  async db() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'reachable' };
  }
}
