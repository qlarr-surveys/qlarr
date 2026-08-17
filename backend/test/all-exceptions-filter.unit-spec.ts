import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';
import { ResponseNotFoundException } from '../src/modules/responses/response.exceptions';

/** A fake express Response capturing the rendered status/body. */
function fakeResponse(headersSent = false) {
  const res: {
    headersSent: boolean;
    statusCode?: number;
    body?: unknown;
    ended: boolean;
    status: (c: number) => typeof res;
    json: (b: unknown) => typeof res;
    end: () => void;
  } = {
    headersSent,
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      this.ended = true;
    },
  };
  return res;
}

const hostFor = (res: unknown): ArgumentsHost =>
  ({ switchToHttp: () => ({ getResponse: () => res }) }) as unknown as ArgumentsHost;

const run = (exception: unknown, headersSent = false) => {
  const res = fakeResponse(headersSent);
  new AllExceptionsFilter().catch(exception, hostFor(res));
  return res;
};

describe('AllExceptionsFilter', () => {
  it('adds the missing `error` field to framework exceptions', () => {
    const res = run(new UnauthorizedException());
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Unauthorized', error: 'UnauthorizedException' });

    const forbidden = run(new ForbiddenException());
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.body).toEqual({ message: 'Forbidden', error: 'ForbiddenException' });
  });

  it('flattens a validation-style message array', () => {
    const res = run(new BadRequestException(['a must be a string', 'b is required']));
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      message: 'a must be a string, b is required',
      error: 'BadRequestException',
    });
  });

  it('reports an over-cap upload (multer PayloadTooLarge) as MaxUploadSizeExceededException', () => {
    // Nest maps multer's LIMIT_FILE_SIZE to PayloadTooLargeException; the filter
    // renames it to the identifier the legacy Spring fallback emitted, keeping 413.
    const res = run(new PayloadTooLargeException('File too large'));
    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({
      message: 'File too large',
      error: 'MaxUploadSizeExceededException',
    });
  });

  it('passes our `{ message, error }` HttpExceptions through unchanged', () => {
    const res = run(new ResponseNotFoundException());
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Response not found', error: 'ResponseNotFoundException' });
  });


  it('turns an uncaught error into a generic 500 "Unexpected error"', () => {
    class BoomError extends Error {}
    const res = run(new BoomError('db socket exploded with secret dsn'));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: 'Unexpected error', error: 'BoomError' });
    // The real message (which could carry internals) is never sent.
    expect(JSON.stringify(res.body)).not.toContain('secret dsn');
  });

  it('does not try to render over an already-committed (streamed) response', () => {
    const res = run(new Error('late failure'), /* headersSent */ true);
    expect(res.ended).toBe(true);
    expect(res.statusCode).toBeUndefined();
    expect(res.body).toBeUndefined();
  });
});
