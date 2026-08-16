import { RouterErrorCode, RouterFailureScope } from '../../../common/enums';
import {
  isRetryableRouterError,
  isTerminalForRequest,
  mapHttpStatusToRouterError,
  mapThrownErrorToRouterError,
  resolveFailureScope,
  shouldQuarantineDeployment,
  shouldSkipProvider,
} from '../utilities/router-error-mapping.utility';

describe('mapHttpStatusToRouterError', () => {
  it.each([
    [429, RouterErrorCode.RATE_LIMITED],
    [401, RouterErrorCode.AUTHENTICATION_FAILED],
    [403, RouterErrorCode.AUTHORIZATION_FAILED],
    [410, RouterErrorCode.MODEL_RETIRED],
    [404, RouterErrorCode.MODEL_NOT_FOUND],
    [422, RouterErrorCode.CAPABILITY_MISMATCH],
    [500, RouterErrorCode.PROVIDER_5XX],
    [502, RouterErrorCode.PROVIDER_5XX],
    [503, RouterErrorCode.PROVIDER_5XX],
  ])('maps status %s to %s', (status, expected) => {
    expect(mapHttpStatusToRouterError(status)).toBe(expected);
  });

  // 401 and 403 look alike but mean different things to an operator: a bad key
  // versus a valid key without entitlement to this model.
  it('separates an invalid credential from a forbidden one', () => {
    expect(mapHttpStatusToRouterError(401)).not.toBe(mapHttpStatusToRouterError(403));
  });

  // A 404 alone cannot say whether the id was mistyped or the model was
  // withdrawn, and the two lead to different fixes.
  it.each([
    'This model has been retired',
    'model is deprecated and no longer available',
    'endpoint sunset on 2026-01-01',
  ])('reads a withdrawn model out of a 404 body: %s', (body) => {
    expect(mapHttpStatusToRouterError(404, body)).toBe(RouterErrorCode.MODEL_RETIRED);
  });

  it('keeps a plain 404 as MODEL_NOT_FOUND', () => {
    expect(mapHttpStatusToRouterError(404, 'no such model: gemini-9')).toBe(
      RouterErrorCode.MODEL_NOT_FOUND,
    );
  });

  it('falls back to UNKNOWN rather than guessing on an unmapped status', () => {
    expect(mapHttpStatusToRouterError(418)).toBe(RouterErrorCode.UNKNOWN);
  });
});

describe('mapThrownErrorToRouterError', () => {
  // httpRequest aborts its own controller on deadline, so an abort with no
  // caller cancellation is a timeout.
  it.each(['AbortError', 'TimeoutError'])('maps a %s to TIMEOUT', (name) => {
    const error = new Error('aborted');
    error.name = name;
    expect(mapThrownErrorToRouterError(error)).toBe(RouterErrorCode.TIMEOUT);
  });

  // The error object is identical whether the deadline fired or the user
  // pressed stop; only the caller knows which, so it must say so.
  it('reports a caller-driven abort as CANCELLED, not TIMEOUT', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    expect(mapThrownErrorToRouterError(error, true)).toBe(RouterErrorCode.CANCELLED);
  });

  it('treats cancellation as cancellation even for a non-Error value', () => {
    expect(mapThrownErrorToRouterError('whatever', true)).toBe(RouterErrorCode.CANCELLED);
  });

  it.each([
    'fetch failed',
    'connect ECONNREFUSED 127.0.0.1:443',
    'read ECONNRESET',
    'getaddrinfo ENOTFOUND api.example.com',
    'socket hang up',
  ])('maps transport failure %s to NETWORK', (message) => {
    expect(mapThrownErrorToRouterError(new Error(message))).toBe(RouterErrorCode.NETWORK);
  });

  it('does not invent a category for an unrecognised error', () => {
    expect(mapThrownErrorToRouterError(new Error('something odd'))).toBe(RouterErrorCode.UNKNOWN);
    expect(mapThrownErrorToRouterError(undefined)).toBe(RouterErrorCode.UNKNOWN);
  });
});

describe('retry policy', () => {
  it.each([
    RouterErrorCode.TIMEOUT,
    RouterErrorCode.RATE_LIMITED,
    RouterErrorCode.PROVIDER_5XX,
    RouterErrorCode.NETWORK,
  ])('%s may be retried', (code) => {
    expect(isRetryableRouterError(code)).toBe(true);
  });

  // A credential does not become valid because it was asked twice, and
  // hammering an auth failure is how a provider starts throttling everything.
  it.each([RouterErrorCode.AUTHENTICATION_FAILED, RouterErrorCode.AUTHORIZATION_FAILED])(
    '%s is never retried',
    (code) => {
      expect(isRetryableRouterError(code)).toBe(false);
    },
  );

  it.each([
    RouterErrorCode.MODEL_NOT_FOUND,
    RouterErrorCode.MODEL_RETIRED,
    RouterErrorCode.CANCELLED,
    RouterErrorCode.BUDGET_EXCEEDED,
    RouterErrorCode.POLICY_BLOCKED,
  ])('%s is not retryable', (code) => {
    expect(isRetryableRouterError(code)).toBe(false);
  });
});

describe('failure scope', () => {
  // The seeded chain is Gemini, Gemini, then four Ollama Cloud entries. A
  // Google-wide outage must skip entry 2 instead of burning a timeout on it.
  it.each([
    RouterErrorCode.TIMEOUT,
    RouterErrorCode.NETWORK,
    RouterErrorCode.PROVIDER_5XX,
    RouterErrorCode.RATE_LIMITED,
    RouterErrorCode.AUTHENTICATION_FAILED,
    RouterErrorCode.AUTHORIZATION_FAILED,
  ])('%s condemns the whole provider', (code) => {
    expect(resolveFailureScope(code)).toBe(RouterFailureScope.PROVIDER);
    expect(shouldSkipProvider(code)).toBe(true);
  });

  // A model-specific fault must not condemn the provider, or one bad model id
  // would remove every sibling from the chain.
  it.each([
    RouterErrorCode.MODEL_NOT_FOUND,
    RouterErrorCode.MODEL_RETIRED,
    RouterErrorCode.CAPABILITY_MISMATCH,
    RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT,
    RouterErrorCode.LOW_CONFIDENCE,
  ])('%s advances to the next entry only', (code) => {
    expect(resolveFailureScope(code)).toBe(RouterFailureScope.MODEL);
    expect(shouldSkipProvider(code)).toBe(false);
    expect(isTerminalForRequest(code)).toBe(false);
  });

  it.each([
    RouterErrorCode.CANCELLED,
    RouterErrorCode.BUDGET_EXCEEDED,
    RouterErrorCode.POLICY_BLOCKED,
  ])('%s stops the request rather than routing around it', (code) => {
    expect(resolveFailureScope(code)).toBe(RouterFailureScope.REQUEST);
    expect(isTerminalForRequest(code)).toBe(true);
    expect(shouldSkipProvider(code)).toBe(false);
  });

  // Wrongly condemning a provider costs more candidates than wrongly advancing
  // one entry, so the unknown case takes the narrower scope.
  it('treats an unknown failure conservatively', () => {
    expect(resolveFailureScope(RouterErrorCode.UNKNOWN)).toBe(RouterFailureScope.MODEL);
  });

  it('assigns a scope to every code in the enum', () => {
    for (const code of Object.values(RouterErrorCode)) {
      expect(Object.values(RouterFailureScope)).toContain(resolveFailureScope(code));
    }
  });
});

describe('quarantine policy', () => {
  // Without this the chain re-selects a withdrawn model on every request,
  // spending an attempt each time to learn what it already knew.
  it.each([
    RouterErrorCode.MODEL_NOT_FOUND,
    RouterErrorCode.MODEL_RETIRED,
    RouterErrorCode.AUTHENTICATION_FAILED,
    RouterErrorCode.AUTHORIZATION_FAILED,
  ])('%s takes the deployment out of rotation', (code) => {
    expect(shouldQuarantineDeployment(code)).toBe(true);
  });

  // A timeout says nothing about whether the record is correct.
  it.each([
    RouterErrorCode.TIMEOUT,
    RouterErrorCode.RATE_LIMITED,
    RouterErrorCode.PROVIDER_5XX,
    RouterErrorCode.NETWORK,
    RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT,
    RouterErrorCode.LOW_CONFIDENCE,
  ])('%s leaves the deployment in rotation', (code) => {
    expect(shouldQuarantineDeployment(code)).toBe(false);
  });

  // Quarantine is about the record being wrong; a cancelled request implies
  // nothing about the endpoint.
  it('never quarantines on a request-scoped failure', () => {
    for (const code of [
      RouterErrorCode.CANCELLED,
      RouterErrorCode.BUDGET_EXCEEDED,
      RouterErrorCode.POLICY_BLOCKED,
    ]) {
      expect(shouldQuarantineDeployment(code)).toBe(false);
    }
  });
});

describe('non-JSON provider responses', () => {
  // httpRequest parses every response as JSON, so a provider answering with an
  // HTML 502 page throws and the status is already lost. Classifying that
  // UNKNOWN made it neither retryable nor provider-scoped, so the chain kept
  // hammering a dead provider. These adapters only call JSON endpoints, so a
  // non-JSON body is a provider malfunction by definition.
  it('maps a JSON parse failure to PROVIDER_5XX', () => {
    const error = new SyntaxError('Unexpected token < in JSON at position 0');
    expect(mapThrownErrorToRouterError(error)).toBe(RouterErrorCode.PROVIDER_5XX);
  });

  it('makes that failure retryable and provider-scoped', () => {
    const code = mapThrownErrorToRouterError(new SyntaxError('Unexpected token <'));
    expect(isRetryableRouterError(code)).toBe(true);
    expect(shouldSkipProvider(code)).toBe(true);
  });

  // Cancellation still wins: a user pressing stop is not a provider fault.
  it('still reports a cancelled parse failure as CANCELLED', () => {
    expect(mapThrownErrorToRouterError(new SyntaxError('x'), true)).toBe(RouterErrorCode.CANCELLED);
  });
});
