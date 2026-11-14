/**
 * pg-boss, which ships ES modules only. Node's own `require` loads ES modules
 * (Node 22.12+); taken from `process.getBuiltinModule` so Jest, whose module
 * registry can't, gets Node's too.
 */
const nodeModule = (
  process as unknown as {
    getBuiltinModule(id: 'node:module'): typeof import('node:module');
  }
).getBuiltinModule('node:module');

export const { PgBoss } = nodeModule.createRequire(__filename)(
  'pg-boss',
) as typeof import('pg-boss');
