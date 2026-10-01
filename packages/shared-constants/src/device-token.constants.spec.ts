import { describe, expect, it } from 'vitest';

import {
  MOBILE_ACCESS_TOKEN_TTL_SECONDS,
  MOBILE_DEVICE_MAX_AGE_DAYS,
  MOBILE_DEVICE_SCOPE_VALUES,
  MOBILE_MAX_ACTIVE_DEVICES_PER_USER,
  MOBILE_REFRESH_TOKEN_TTL_DAYS,
} from './device-token.constants';

describe('mobile device token constants (F097)', () => {
  it('lists exactly the three run scopes, once each', () => {
    expect([...MOBILE_DEVICE_SCOPE_VALUES].sort()).toEqual([
      'runs:approve',
      'runs:cancel',
      'runs:read',
    ]);
  });

  it('never lists a shell, filesystem, policy or device-management scope', () => {
    for (const scope of MOBILE_DEVICE_SCOPE_VALUES) {
      expect(scope).toMatch(/^runs:/);
    }
  });

  it('keeps the access token short and the refresh chain bounded', () => {
    expect(MOBILE_ACCESS_TOKEN_TTL_SECONDS).toBeLessThanOrEqual(900);
    expect(MOBILE_REFRESH_TOKEN_TTL_DAYS).toBeLessThanOrEqual(MOBILE_DEVICE_MAX_AGE_DAYS);
    expect(MOBILE_MAX_ACTIVE_DEVICES_PER_USER).toBeGreaterThan(0);
  });
});
