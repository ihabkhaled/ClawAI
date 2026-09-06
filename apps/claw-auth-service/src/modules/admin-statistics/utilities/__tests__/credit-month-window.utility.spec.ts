import { buildCreditMonthWindowStart } from '../credit-month-window.utility';

describe('buildCreditMonthWindowStart', () => {
  it('anchors to the first of the month, so the oldest bucket is a whole month', () => {
    const start = buildCreditMonthWindowStart(new Date('2026-08-17T23:45:00.000Z'), 3);

    // June 1st, not "three months before the 17th". A window opening mid-month
    // would report a fragment of June beside a full July and invite the reader
    // to compare them as if they were the same size.
    expect(start.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('counts the current month as one of the months requested', () => {
    const start = buildCreditMonthWindowStart(new Date('2026-08-17T00:00:00.000Z'), 1);

    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('rolls back across a year boundary', () => {
    const start = buildCreditMonthWindowStart(new Date('2026-02-09T08:00:00.000Z'), 6);

    expect(start.toISOString()).toBe('2025-09-01T00:00:00.000Z');
  });

  it('rolls back a full year without landing in the wrong one', () => {
    const start = buildCreditMonthWindowStart(new Date('2026-01-31T23:59:59.000Z'), 12);

    expect(start.toISOString()).toBe('2025-02-01T00:00:00.000Z');
  });

  it('ignores the local timezone of the input instant', () => {
    // Same instant, expressed with an offset. The window is a UTC concept and
    // must not shift because the caller's clock is not on UTC.
    const start = buildCreditMonthWindowStart(new Date('2026-03-01T00:30:00.000+02:00'), 2);

    // 2026-03-01T00:30+02:00 is 2026-02-28T22:30Z, so the anchor month is February.
    expect(start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
