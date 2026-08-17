import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureBodyParsers } from './app-config';

// The backend operates entirely in UTC — timestamps are stored/read as UTC
// wall clocks and this app writes UTC strings. UTC is
// pinned in the runtime env (Dockerfile `ENV TZ=UTC`, npm scripts) so pg builds
// zone-less timestamps in UTC and no DST gap can drift a value; this line is a
// belt for any launch that forgets to set it. The env schema additionally
// rejects an explicit non-UTC TZ at boot.
process.env.TZ ||= 'UTC';

async function bootstrap() {
  // Disable Nest's default body parser (body-parser's 100kb JSON cap) so
  // configureBodyParsers can re-register it with a generous limit; the
  // design-save and offline-sync bodies carry the whole survey JSON.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // CORS — allow all origins for the REST verbs used.
  // `allowedHeaders` is left unset so the middleware reflects
  // the request's headers, which — unlike a literal
  // `*` — correctly permits the `Authorization` bearer header. Auth is
  // header-based (no cookies), so a wildcard origin needs no credentials.
  //
  // MUST run before configureBodyParsers: the CORS middleware sets its headers
  // then calls next(), so they're already on the response if a LATER middleware
  // fails. If the body parser is registered first, a malformed-JSON body throws
  // and Express skips the (non-error) CORS middleware entirely — the 4xx then
  // goes out with no Access-Control-Allow-Origin, so the browser masks a real
  // error as a network failure ("backend unreachable").
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  configureBodyParsers(app);
  // The request-body ValidationPipe is registered globally via APP_PIPE in
  // AppModule (so tests bootstrapping AppModule get it too).
  // Target home is 8080. Override with PORT to run on a different port locally.
  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Qlarr backend (NestJS) listening on http://localhost:${port}`);
}
bootstrap();
