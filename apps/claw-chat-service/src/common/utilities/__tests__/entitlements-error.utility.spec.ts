import { EntitlementsRequestError } from '@claw/shared-entitlements';

import { toEntitlementsException } from '../entitlements-error.utility';

describe('toEntitlementsException', () => {
  // A user whose free trial had ended was told the service was down: the
  // PLAN_TRIAL_EXPIRED refusal was relabelled ENTITLEMENTS_UNAVAILABLE/503, so
  // the frontend never showed its "trial ended" notice.
  it('passes a deliberate trial refusal through with its own code and status', () => {
    const exception = toEntitlementsException(new EntitlementsRequestError(403, 'PLAN_TRIAL_EXPIRED'));
    expect(exception.getStatus()).toBe(403);
    expect(exception.getResponse()).toMatchObject({ code: 'PLAN_TRIAL_EXPIRED' });
  });

  it('keeps a genuine failure a 503 outage', () => {
    const exception = toEntitlementsException(new Error('ECONNREFUSED'));
    expect(exception.getStatus()).toBe(503);
    expect(exception.getResponse()).toMatchObject({ code: 'ENTITLEMENTS_UNAVAILABLE' });
  });
});
