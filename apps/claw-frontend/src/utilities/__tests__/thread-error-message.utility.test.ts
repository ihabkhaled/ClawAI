import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/services/shared/api-client';

import {
  isThreadNotFoundError,
  isThreadPollFatalError,
  resolveThreadErrorMessage,
} from '../thread-error-message.utility';

function apiError(status: number, code?: string): ApiClientError {
  return new ApiClientError({ message: 'boom', status, code });
}

describe('resolveThreadErrorMessage', () => {
  it('maps 404 to the not-found-or-not-yours message', () => {
    expect(resolveThreadErrorMessage(apiError(404))).toEqual({
      key: 'chat.threadProgress.error.notFound',
    });
  });

  it('maps 403 to the existing plan message', () => {
    expect(resolveThreadErrorMessage(apiError(403))).toEqual({ key: 'chat.threadPlanRequired' });
  });

  it('maps 409 to the cancel-first-or-retry-later message for delete and retry', () => {
    expect(resolveThreadErrorMessage(apiError(409))).toEqual({
      key: 'chat.threadProgress.error.conflict',
    });
  });

  it('maps 402 to the credit message', () => {
    expect(resolveThreadErrorMessage(apiError(402))).toEqual({
      key: 'chat.threadProgress.error.credit',
    });
  });

  it('echoes a safe machine code in the generic message', () => {
    expect(resolveThreadErrorMessage(apiError(500, 'UPSTREAM_BROKEN'))).toEqual({
      key: 'chat.threadProgress.error.genericWithCode',
      params: { code: 'UPSTREAM_BROKEN' },
    });
  });

  it('never echoes a code that is not a machine code', () => {
    expect(resolveThreadErrorMessage(apiError(500, 'secret token: abc <script>'))).toEqual({
      key: 'chat.threadProgress.error.generic',
    });
  });

  it('falls back to the generic message for a non-API error and an API error without a code', () => {
    expect(resolveThreadErrorMessage(new Error('x'))).toEqual({
      key: 'chat.threadProgress.error.generic',
    });
    expect(resolveThreadErrorMessage(apiError(500))).toEqual({
      key: 'chat.threadProgress.error.generic',
    });
  });
});

describe('isThreadNotFoundError', () => {
  it('is true only for a 404 API error', () => {
    expect(isThreadNotFoundError(apiError(404))).toBe(true);
    expect(isThreadNotFoundError(apiError(500))).toBe(false);
    expect(isThreadNotFoundError(new Error('404'))).toBe(false);
  });
});

describe('isThreadPollFatalError', () => {
  it('is true only for 404 and 403 API errors', () => {
    expect(isThreadPollFatalError(apiError(404))).toBe(true);
    expect(isThreadPollFatalError(apiError(403))).toBe(true);
    expect(isThreadPollFatalError(apiError(500))).toBe(false);
    expect(isThreadPollFatalError(new Error('x'))).toBe(false);
  });
});
