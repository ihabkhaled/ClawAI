import { describe, expect, it } from 'vitest';

import { isClientHttpError } from '../client-http-error.utility';

// Built the way `http-errors` builds body-parser's errors.
const middlewareError = (status: number, expose: boolean): Error =>
  Object.assign(new Error('x'), { status, statusCode: status, expose });

describe('isClientHttpError', () => {
  it.each([400, 413, 415, 499])('accepts an exposed %i from middleware', (status) => {
    expect(isClientHttpError(middlewareError(status, true))).toBe(true);
  });

  it.each([
    ['a 5xx', middlewareError(503, true)],
    ['a 3xx', middlewareError(302, true)],
    ['a 4xx not marked safe to show', middlewareError(404, false)],
    ['a plain error', new Error('boom')],
    ['a non-error shaped like one', { status: 413, expose: true, message: 'x' }],
    ['a string status', Object.assign(new Error('x'), { status: '413', expose: true })],
    ['null', null],
  ])('rejects %s', (_label, value) => {
    expect(isClientHttpError(value)).toBe(false);
  });
});
