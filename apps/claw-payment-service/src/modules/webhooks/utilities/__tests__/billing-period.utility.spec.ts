import { BillingInterval } from '@claw/shared-types';

import { resolvePeriodEndMs } from '../billing-period.utility';

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

describe('resolvePeriodEndMs', () => {
  it('advances one calendar month', () => {
    const start = Date.UTC(2026, 0, 15);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.MONTHLY))).toBe(
      '2026-02-15T00:00:00.000Z',
    );
  });

  it('clamps a 31st subscriber into a short month instead of rolling over', () => {
    // Naive date arithmetic turns 31 Jan + 1 month into 3 March, which both
    // gives away three free days and moves the anniversary permanently.
    const start = Date.UTC(2026, 0, 31);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.MONTHLY))).toBe(
      '2026-02-28T00:00:00.000Z',
    );
  });

  it('lands on 29 February in a leap year', () => {
    const start = Date.UTC(2028, 0, 31);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.MONTHLY))).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });

  it('crosses a year boundary', () => {
    const start = Date.UTC(2026, 11, 10);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.MONTHLY))).toBe(
      '2027-01-10T00:00:00.000Z',
    );
  });

  it('advances one calendar year', () => {
    const start = Date.UTC(2026, 5, 1);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.YEARLY))).toBe('2027-06-01T00:00:00.000Z');
  });

  it('does not lose a day across a leap year on a yearly plan', () => {
    // Adding 365 fixed days from 1 March 2027 would land on 29 February 2028.
    const start = Date.UTC(2027, 2, 1);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.YEARLY))).toBe('2028-03-01T00:00:00.000Z');
  });

  it('keeps the time of day', () => {
    const start = Date.UTC(2026, 3, 10, 13, 45, 30);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.MONTHLY))).toBe(
      '2026-05-10T13:45:30.000Z',
    );
  });

  it('advances three calendar months for QUARTERLY', () => {
    const start = Date.UTC(2026, 4, 31);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.QUARTERLY))).toBe(
      '2026-08-31T00:00:00.000Z',
    );
  });

  it('advances six calendar months and clamps for SEMIANNUAL', () => {
    const start = Date.UTC(2026, 7, 31);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.SEMIANNUAL))).toBe(
      '2027-02-28T00:00:00.000Z',
    );
  });

  it('clamps a 29 February start into 28 February for YEARLY', () => {
    const start = Date.UTC(2028, 1, 29);
    expect(iso(resolvePeriodEndMs(start, BillingInterval.YEARLY))).toBe('2029-02-28T00:00:00.000Z');
  });
});
