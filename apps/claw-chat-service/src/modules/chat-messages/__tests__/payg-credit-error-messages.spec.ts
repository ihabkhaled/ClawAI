import { BillingErrorCode } from '@claw/shared-types';

import {
  PAYG_CREDIT_ERROR_MESSAGES,
  PAYG_CREDIT_FALLBACK_ERROR_MESSAGE,
} from '../constants/payg.constants';

describe('PAYG_CREDIT_ERROR_MESSAGES', () => {
  const paygCodes = Object.values(BillingErrorCode).filter((code) => code.startsWith('PAYG_'));

  it.each(paygCodes)('has its own sentence for %s, not the generic fallback', (code) => {
    const message = PAYG_CREDIT_ERROR_MESSAGES[code];

    expect(message).toBeTruthy();
    expect(message).not.toBe(PAYG_CREDIT_FALLBACK_ERROR_MESSAGE);
  });

  it('tells a Free user whose free requests are spent to upgrade or add credit, and that included models work', () => {
    const message = PAYG_CREDIT_ERROR_MESSAGES[BillingErrorCode.PAYG_FREE_ALLOWANCE_EXHAUSTED];

    expect(message).toMatch(/free requests/i);
    expect(message).toMatch(/upgrade/i);
    expect(message).toMatch(/add credit/i);
    expect(message).toMatch(/included models still work/i);
  });

  it('never blames an empty wallet for a spent free allowance', () => {
    expect(PAYG_CREDIT_ERROR_MESSAGES[BillingErrorCode.PAYG_FREE_ALLOWANCE_EXHAUSTED]).not.toBe(
      PAYG_CREDIT_ERROR_MESSAGES[BillingErrorCode.PAYG_CREDIT_EXHAUSTED],
    );
  });
});
