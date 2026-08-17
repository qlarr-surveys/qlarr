import { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';

/**
 * Register the HTTP body parsers with a generous size limit, replacing Nest's
 * default body-parser (whose 100kb JSON cap 413'd every real design save — the
 * whole survey JSON — before the handler ran). There is no separate JSON cap,
 * so it matches the 100MB multipart ceiling here.
 *
 * The caller MUST create the app with `{ bodyParser: false }`; otherwise the
 * default 100kb parser is already registered and runs first. Shared by the
 * production bootstrap and the integration test harness so both exercise the
 * same limits.
 */
export function configureBodyParsers(app: INestApplication): void {
  // `strict: false` accepts anything JSON.parse does, not just objects/arrays.
  // Bodyless endpoints (e.g. change_code, whose inputs are all query params) are
  // still called by clients with a `null`/primitive JSON body; strict mode would
  // reject that at the parser with a 400 before the handler runs. Handlers that
  // need a real object still validate it via their DTO + ValidationPipe.
  app.use(json({ limit: '100mb', strict: false }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));
}
