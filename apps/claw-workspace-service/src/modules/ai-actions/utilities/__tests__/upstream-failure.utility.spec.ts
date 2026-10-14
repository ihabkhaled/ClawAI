import { CloudGenerationError } from '../cloud-generation-error';
import { describeUpstreamFailure } from '../upstream-failure.utility';

describe('describeUpstreamFailure', () => {
  it('reads a provider 404 wrapped in a chat-service 400 as model-not-found', () => {
    const body = '{"statusCode":400,"message":"Provider GEMINI returned 404: models/x"}';
    const out = describeUpstreamFailure(new CloudGenerationError(400, body));
    expect(out).toEqual({
      code: 'UPSTREAM_MODEL_NOT_FOUND',
      message: 'This model is not available.',
    });
  });

  it.each([
    [402, 'UPSTREAM_PAYMENT_REQUIRED'],
    [401, 'UPSTREAM_AUTH_FAILED'],
    [429, 'UPSTREAM_RATE_LIMITED'],
    [503, 'UPSTREAM_UNAVAILABLE'],
    [504, 'UPSTREAM_TIMEOUT'],
    [500, 'UPSTREAM_ERROR'],
    [422, 'UPSTREAM_BAD_REQUEST'],
  ])('maps HTTP %i to %s without echoing the body', (status, code) => {
    const out = describeUpstreamFailure(new CloudGenerationError(status, '{"secret":"body"}'));
    expect(out.code).toBe(code);
    expect(out.message).not.toContain('{');
  });

  it('maps an abort to a timeout and unknown errors to a generic code', () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    expect(describeUpstreamFailure(abort).code).toBe('UPSTREAM_TIMEOUT');
    expect(describeUpstreamFailure('boom').code).toBe('UPSTREAM_ERROR');
  });
});
