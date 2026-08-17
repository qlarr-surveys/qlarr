import { HealthController } from '../src/health/health.controller';

/**
 * /health/db is a @Public readiness probe — it must confirm DB reachability
 * without leaking the Postgres build string (previously `SELECT version()`).
 */
describe('HealthController.db — readiness without a version leak', () => {
  it('returns only a reachability boolean and never selects version()', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = new HealthController({ query } as any);

    const res = await controller.db();

    expect(res).toEqual({ status: 'ok', database: 'reachable' });
    expect(res).not.toHaveProperty('version');
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(query.mock.calls.flat().join(' ')).not.toMatch(/version\(\)/i);
  });
});
