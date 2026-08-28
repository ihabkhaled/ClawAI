import { describeEntitlementsFailure } from '../describe-failure';

describe('describeEntitlementsFailure', () => {
  // Every caller used to discard the reason, so an intermittent 503 could not
  // be told apart from a timeout, a refused connection or a 500 upstream.
  it('names the timeout rather than the abort it surfaces as', () => {
    const abort = new Error('The operation was aborted');
    abort.name = 'AbortError';

    expect(describeEntitlementsFailure(abort, 5000)).toBe('timed out after 5000ms');
  });

  it('unwraps the transport code hidden on cause', () => {
    // "fetch failed" on its own says nothing useful.
    const error = new TypeError('fetch failed');
    (error as { cause?: unknown }).cause = { code: 'ECONNREFUSED' };

    expect(describeEntitlementsFailure(error, 5000)).toBe('fetch failed (ECONNREFUSED)');
  });

  it('falls back to the message when there is no cause code', () => {
    expect(describeEntitlementsFailure(new Error('boom'), 5000)).toBe('boom');
  });

  it('handles a thrown non-error without crashing the logger', () => {
    expect(describeEntitlementsFailure('nope', 5000)).toBe('unknown error');
  });
});
