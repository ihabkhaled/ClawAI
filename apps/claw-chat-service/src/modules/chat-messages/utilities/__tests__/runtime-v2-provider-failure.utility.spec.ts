import {
  RUNTIME_V2_TRANSIENT_PROVIDER_CODE,
  RUNTIME_V2_TRANSIENT_PROVIDER_RETRIES,
} from '../../constants/runtime-v2-failure.constants';
import {
  delay,
  providerFailureCode,
  transientProviderBackoffMs,
} from '../runtime-v2-provider-failure.utility';

/**
 * Every non-2xx from a provider used to collapse into one code, so the runtime
 * loop treated "your request is malformed" and "I had a bad moment" the same
 * way: end the run. A 500 arriving mid-task discarded sixteen admitted tools
 * and every file already read.
 */
describe('providerFailureCode', () => {
  it.each([408, 429, 500, 502, 503, 504])('calls %i transient', (status) => {
    expect(providerFailureCode(status)).toBe(RUNTIME_V2_TRANSIENT_PROVIDER_CODE);
  });

  it.each([400, 401, 403, 404, 409, 413, 422])('leaves %i permanent', (status) => {
    // Repeating a request the provider rejected is not a recovery; it is the
    // same failure three times and a slower error for the user.
    expect(providerFailureCode(status)).toBe('CLOUD_PROVIDER_REQUEST_FAILED');
  });
});

describe('transientProviderBackoffMs', () => {
  it('grows with each attempt', () => {
    expect(transientProviderBackoffMs(1)).toBeLessThan(transientProviderBackoffMs(2));
    expect(transientProviderBackoffMs(2)).toBeLessThan(transientProviderBackoffMs(3));
  });

  it('never returns zero, however many retries are configured', () => {
    // Raising the retry count must not index off the table and produce a busy
    // loop against a provider that is already struggling.
    for (let attempt = 0; attempt <= RUNTIME_V2_TRANSIENT_PROVIDER_RETRIES + 5; attempt += 1) {
      expect(transientProviderBackoffMs(attempt)).toBeGreaterThan(0);
    }
  });
});

describe('delay', () => {
  it('waits at least the requested time', async () => {
    const started = Date.now();
    await delay(25);
    expect(Date.now() - started).toBeGreaterThanOrEqual(20);
  });
});
