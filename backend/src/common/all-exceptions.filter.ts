import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Response } from 'express';

/** The uniform error body. */
interface ErrorBody {
  message: string | null;
  error: string;
}

/**
 * Normalize every error response to `{ message, error }` — the shape the
 * frontend's `processError` switches on.
 *
 * Our hand-rolled `HttpException`s already carry `{ message, error }` and pass
 * through untouched. Framework exceptions (`UnauthorizedException` etc.) emit
 * `{ message, statusCode }` with no `error` field, so the frontend can't
 * recognise them — those are reshaped here. Uncaught errors become a generic
 * 500 `Unexpected error` instead of Nest's `Internal server error`, and never
 * leak their internals to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    // A streamed response (e.g. the bulk-download ZIP) may already be committed;
    // its own error handling owns the socket, so there's nothing to render here.
    if (res.headersSent) {
      res.end();
      return;
    }

    const { status, body } = this.render(exception);
    res.status(status).json(body);
  }

  private render(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      // Our exceptions already carry `{ message, error }` — pass through as-is.
      if (isErrorBody(response)) {
        return { status, body: response };
      }
      // Framework exceptions: keep the status, synthesise the missing `error`
      // from the class name. Multer turns a part exceeding the global upload cap
      // into a PayloadTooLargeException; report it as
      // `MaxUploadSizeExceededException`, which is what
      // clients switch on for "file too large".
      const message =
        typeof response === 'string'
          ? response
          : (response as { message?: unknown }).message;
      const error =
        exception instanceof PayloadTooLargeException
          ? 'MaxUploadSizeExceededException'
          : exception.constructor.name;
      return {
        status,
        body: { message: toMessage(message ?? exception.message), error },
      };
    }

    // Uncaught / non-HTTP error → 500 "Unexpected error" (also logs the
    // stack). Never send internals to the client.
    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        message: 'Unexpected error',
        error: exception instanceof Error ? exception.constructor.name : 'Error',
      },
    };
  }
}

/**
 * A response object already in our `{ message, error }` shape. Framework
 * exceptions also expose a string `error` (the reason phrase, e.g.
 * `"Bad Request"`) but always alongside a `statusCode`; our hand-rolled bodies
 * never carry `statusCode`, which is what distinguishes them.
 */
function isErrorBody(response: unknown): response is ErrorBody {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof (response as { error?: unknown }).error === 'string' &&
    (response as { statusCode?: unknown }).statusCode === undefined
  );
}

/** Nest can carry `message` as a string or a string[] (validation) — flatten it. */
function toMessage(message: unknown): string {
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' ? message : String(message);
}
