import { randomUUID } from 'node:crypto';

import type { LoggerService } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import pino, { type Logger } from 'pino';

/**
 * Structured logs (A5): one JSON line per event, for Render's log viewer.
 *
 * The rule: logs describe what happened, never what the owner stored. So
 *  - requests are logged as method, route (ids masked), status and time —
 *    never the query string (searches hold the words typed), headers
 *    (session token, web secret) or body;
 *  - errors keep their type, first line and stack frames — never the rest
 *    of the message, where a database error can quote the data it was
 *    given — with email addresses and long numbers masked even there;
 *  - known secret and personal field names are redacted wherever they
 *    appear in a logged object, as a second line of defence.
 */
export const REDACT = [
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'challenge',
  'code',
  'setupToken',
  'authorization',
  'cookie',
  'email',
  'phones',
  'emails',
  'notes',
  'displayName',
].flatMap((k) => [k, `*.${k}`, `*.*.${k}`]);

export function createLogger(
  level: string,
  destination?: pino.DestinationStream,
): Logger {
  return pino(
    {
      level,
      base: { service: 'api' },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: REDACT, censor: '[redacted]' },
    },
    destination,
  );
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** "/contacts/0192…/phones?q=mama" → "/contacts/:id/phones". */
export function routeOf(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  return (
    path
      .replace(UUID, ':id')
      .replace(/\/\d{4,}(?=\/|$)/g, '/:n')
      // Anything else odd in a path segment (a probe, a typo'd name).
      .replace(/\/[^/]*[^\w\-.:/][^/]*/g, '/:x')
      .slice(0, 200)
  );
}

/** Masks what could identify a person if it slipped into a message. */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[number]');
}

/** An error without its data: type, first line (scrubbed), stack frames. */
export function safeError(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) {
    return { type: typeof err };
  }
  const first =
    err.message
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? '';
  const frames = (err.stack ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at '))
    .slice(0, 12);
  const code = (err as { code?: unknown }).code;
  return {
    type: err.name,
    ...(typeof code === 'string' ? { errCode: code.slice(0, 20) } : {}),
    first: scrub(first).slice(0, 200),
    frames,
  };
}

/** Nest's own messages (boot, routes, errors) through the same logger. */
export class PinoNestLogger implements LoggerService {
  constructor(private readonly pino: Logger) {}

  private write(
    level: 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal',
    message: unknown,
    rest: unknown[],
  ): void {
    // Nest passes (message, context) or, for errors, (message, stack, context).
    const context =
      typeof rest[rest.length - 1] === 'string'
        ? (rest[rest.length - 1] as string)
        : undefined;
    const errArg = rest.find((r) => r instanceof Error);
    const stack =
      level === 'error' &&
      typeof rest[0] === 'string' &&
      rest.length > 1 &&
      rest[0].includes('\n    at ')
        ? rest[0]
        : undefined;
    const fields: Record<string, unknown> = {};
    if (context) fields.context = context;
    if (message instanceof Error) fields.err = safeError(message);
    else if (errArg) fields.err = safeError(errArg);
    else if (stack) {
      const e = new Error('');
      e.stack = stack;
      fields.err = { frames: safeError(e).frames };
    }
    const text =
      message instanceof Error
        ? 'error'
        : scrub(String(message).split('\n')[0]).slice(0, 300);
    this.pino[level](fields, text);
  }

  log(message: unknown, ...rest: unknown[]): void {
    this.write('info', message, rest);
  }
  error(message: unknown, ...rest: unknown[]): void {
    this.write('error', message, rest);
  }
  warn(message: unknown, ...rest: unknown[]): void {
    this.write('warn', message, rest);
  }
  debug(message: unknown, ...rest: unknown[]): void {
    this.write('debug', message, rest);
  }
  verbose(message: unknown, ...rest: unknown[]): void {
    this.write('trace', message, rest);
  }
  fatal(message: unknown, ...rest: unknown[]): void {
    this.write('fatal', message, rest);
  }
}

/** One line per request, written when the response is finished. */
export function requestLogger(log: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();
    const given = req.header('x-request-id');
    const id = given && /^[\w-]{8,64}$/.test(given) ? given : randomUUID();
    res.setHeader('x-request-id', id);
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const status = res.statusCode;
      const line = {
        req: { id, method: req.method, route: routeOf(req.originalUrl) },
        res: { status },
        ms: Math.round(ms),
      };
      if (status >= 500) log.error(line, 'request failed');
      else if (req.path.startsWith('/health')) log.debug(line, 'request');
      else log.info(line, 'request');
    });
    next();
  };
}
