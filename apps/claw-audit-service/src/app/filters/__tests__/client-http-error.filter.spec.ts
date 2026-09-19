import { HttpStatus, NotFoundException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalExceptionFilter } from '../global-exception.filter';

// The error body-parser throws, built the way `http-errors` builds it.
function middlewareError(status: number, expose: boolean, message: string): Error {
  return Object.assign(new Error(message), { status, statusCode: status, expose });
}

describe('GlobalExceptionFilter: errors thrown before Nest (TD-032)', () => {
  let filter: GlobalExceptionFilter;
  let logError: ReturnType<typeof vi.spyOn>;

  function send(exception: unknown): { status: unknown; body: Record<string, unknown> } {
    const response = { status: vi.fn(), json: vi.fn() };
    response.status.mockReturnValue(response);
    filter.catch(exception, new ExecutionContextHost([{}, response, vi.fn()]));
    return { status: response.status.mock.calls[0]?.[0], body: response.json.mock.calls[0]?.[0] };
  }

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    logError = vi.spyOn(filter['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // TD-032: a malformed or oversized body used to come back as a 500, so the
  // caller saw "server error" for its own mistake and the logs filled with noise.
  it.each([
    [HttpStatus.PAYLOAD_TOO_LARGE, 'request entity too large'],
    [HttpStatus.BAD_REQUEST, 'Unexpected token } in JSON at position 9'],
    [HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'unsupported charset "UTF-7"'],
  ])('returns the %i a body-parser error carries', (status, message) => {
    const sent = send(middlewareError(status, true, message));

    expect(sent.status).toBe(status);
    expect(sent.body).toMatchObject({ statusCode: status, message });
    expect(logError).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a 5xx middleware error',
      middlewareError(HttpStatus.SERVICE_UNAVAILABLE, true, 'upstream down'),
    ],
    [
      'a 4xx error not marked safe to show',
      middlewareError(HttpStatus.NOT_FOUND, false, '/srv/secret'),
    ],
    ['a plain error', new Error('database exploded')],
    ['a non-error value shaped like one', { status: 413, expose: true, message: 'x' }],
  ])('keeps %s a 500 without leaking its message', (_label, exception) => {
    const sent = send(exception);

    expect(sent.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(sent.body).toMatchObject({ message: 'Internal server error' });
  });

  it('still maps an HttpException to its own status', () => {
    const sent = send(new NotFoundException('Not here'));

    expect(sent.status).toBe(HttpStatus.NOT_FOUND);
    expect(sent.body).toMatchObject({ message: 'Not here' });
  });
});
