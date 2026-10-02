import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ThrottlerException } from '@nestjs/throttler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DuplicateEntityException,
  SignupPlanAssignmentFailedException,
} from '../../../common/errors';
import { GlobalExceptionFilter } from '../global-exception.filter';

// Every expected sign-up refusal must reach the client with a stable code and
// the right status; a raw 500 is reserved for the genuinely unexpected.
describe('GlobalExceptionFilter: sign-up failure codes', () => {
  let filter: GlobalExceptionFilter;

  function send(exception: unknown): { status: unknown; body: Record<string, unknown> } {
    const response = { status: vi.fn(), json: vi.fn() };
    response.status.mockReturnValue(response);
    filter.catch(exception, new ExecutionContextHost([{}, response, vi.fn()]));
    return { status: response.status.mock.calls[0]?.[0], body: response.json.mock.calls[0]?.[0] };
  }

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    vi.spyOn(filter['logger'], 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [new DuplicateEntityException('User', 'email'), HttpStatus.CONFLICT, 'DUPLICATE_ENTITY'],
    [
      new SignupPlanAssignmentFailedException(),
      HttpStatus.SERVICE_UNAVAILABLE,
      'SIGNUP_PLAN_ASSIGNMENT_FAILED',
    ],
    [new ThrottlerException(), HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED'],
  ])('%s -> %i %s', (exception, status, code) => {
    const sent = send(exception);
    expect(sent.status).toBe(status);
    expect(sent.body).toMatchObject({ statusCode: status, code, errorCode: code });
  });

  it('carries the validation code and field map of a pipe refusal', () => {
    const sent = send(
      new BadRequestException({
        message: 'Validation failed',
        code: 'VALIDATION_FAILED',
        errors: { password: ['PASSWORD_TOO_SHORT'] },
      }),
    );
    expect(sent.status).toBe(HttpStatus.BAD_REQUEST);
    expect(sent.body).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: { password: ['PASSWORD_TOO_SHORT'] },
    });
  });

  it('keeps an unexpected fault a code-less 500', () => {
    const sent = send(new Error('connection reset'));
    expect(sent.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(sent.body['code']).toBeUndefined();
  });
});
