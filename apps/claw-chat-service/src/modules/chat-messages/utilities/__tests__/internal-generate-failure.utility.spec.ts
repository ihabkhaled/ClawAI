import { HttpException, HttpStatus } from '@nestjs/common';

import {
  BusinessException,
  ProviderCreditExhaustedException,
  StreamCeilingError,
  StreamIdleTimeoutError,
} from '../../../../common/errors';
import {
  classifyGenerateFailure,
  toInternalGenerateErrorFrame,
} from '../internal-generate-failure.utility';

const codeOf = (error: unknown): string | undefined =>
  error instanceof BusinessException ? error.code : undefined;

describe('classifyGenerateFailure', () => {
  it('reads 300 s of silence as MODEL_IDLE_TIMEOUT and releases the hold as a timeout', () => {
    const failure = classifyGenerateFailure(new StreamIdleTimeoutError(300_000), undefined);

    expect(codeOf(failure.error)).toBe('MODEL_IDLE_TIMEOUT');
    expect(failure.releaseReason).toBe('TIMEOUT');
    expect(failure.error instanceof BusinessException && failure.error.getStatus()).toBe(
      HttpStatus.GATEWAY_TIMEOUT,
    );
  });

  it('reads the ceiling as MODEL_HARD_CEILING', () => {
    const failure = classifyGenerateFailure(new StreamCeilingError(600_000), undefined);

    expect(codeOf(failure.error)).toBe('MODEL_HARD_CEILING');
    expect(failure.releaseReason).toBe('TIMEOUT');
  });

  it('reads the buffered timer (a bare AbortError) as the ceiling too', () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');

    expect(codeOf(classifyGenerateFailure(abort, undefined).error)).toBe('MODEL_HARD_CEILING');
  });

  it('reads a caller that went away as CLIENT_ABORTED and releases the hold as cancelled', () => {
    const caller = new AbortController();
    caller.abort();

    const failure = classifyGenerateFailure(
      new DOMException('The operation was aborted.', 'AbortError'),
      caller.signal,
    );

    expect(codeOf(failure.error)).toBe('CLIENT_ABORTED');
    expect(failure.releaseReason).toBe('CANCELLED');
  });

  it('lets a timeout we raised outrank a caller that disconnected right after', () => {
    const caller = new AbortController();
    caller.abort();

    expect(
      codeOf(classifyGenerateFailure(new StreamIdleTimeoutError(300_000), caller.signal).error),
    ).toBe('MODEL_IDLE_TIMEOUT');
  });

  it('leaves any other failure alone and gives the money back as a provider error', () => {
    const original = new BusinessException('Provider said no', 'PROVIDER_REQUEST_FAILED');

    const failure = classifyGenerateFailure(original, new AbortController().signal);

    expect(failure.error).toBe(original);
    expect(failure.releaseReason).toBe('PROVIDER_ERROR');
  });
});

describe('toInternalGenerateErrorFrame', () => {
  it('carries status, machine code and a short message', () => {
    const frame = toInternalGenerateErrorFrame(
      new BusinessException(
        'Model kimi reasoned but produced no answer',
        'MODEL_REASONED_NO_ANSWER',
        502,
      ),
    );

    expect(frame).toEqual({
      type: 'error',
      status: 502,
      code: 'MODEL_REASONED_NO_ANSWER',
      message: 'Model kimi reasoned but produced no answer',
    });
  });

  it('passes a pay-as-you-go refusal through with its 402 and its code', () => {
    const frame = toInternalGenerateErrorFrame(
      new BusinessException(
        'Out of credit',
        'PAYG_CREDIT_INSUFFICIENT',
        HttpStatus.PAYMENT_REQUIRED,
      ),
    );

    expect(frame.status).toBe(402);
    expect(frame.code).toBe('PAYG_CREDIT_INSUFFICIENT');
  });

  it('keeps a provider credit exhaustion code', () => {
    const frame = toInternalGenerateErrorFrame(new ProviderCreditExhaustedException(undefined));

    expect(frame.code).toBe('PROVIDER_CREDIT_EXHAUSTED');
    expect(frame.status).toBe(503);
  });

  it('falls back to a fixed code when the exception carries none, or a malformed one', () => {
    expect(toInternalGenerateErrorFrame(new HttpException('boom', 500)).code).toBe(
      'INTERNAL_GENERATE_FAILED',
    );
    expect(
      toInternalGenerateErrorFrame(new BusinessException('x', 'not a machine code!', 400)).code,
    ).toBe('INTERNAL_GENERATE_FAILED');
  });

  it('replaces a message that carries a URL or a JSON body whole', () => {
    const withUrl = toInternalGenerateErrorFrame(
      new BusinessException(
        'See https://openrouter.ai/settings/keys/abc123 for details',
        'PROVIDER_X',
      ),
    );
    const withJson = toInternalGenerateErrorFrame(
      new BusinessException('{"error":{"message":"no credit"}}', 'PROVIDER_X'),
    );

    expect(withUrl.message).toBe('The model call failed');
    expect(withJson.message).toBe('The model call failed');
  });

  it('bounds a long message', () => {
    const frame = toInternalGenerateErrorFrame(
      new BusinessException('word '.repeat(500), 'PROVIDER_X'),
    );

    expect(frame.message.length).toBeLessThanOrEqual(300);
  });

  it('reports a non-HTTP failure (a dropped connection) as an unreachable provider, never its text', () => {
    const frame = toInternalGenerateErrorFrame(new TypeError('fetch failed: ECONNRESET 10.0.0.5'));

    expect(frame).toEqual({
      type: 'error',
      status: 502,
      code: 'PROVIDER_UNREACHABLE',
      message: 'The model provider could not be reached',
    });
  });
});
