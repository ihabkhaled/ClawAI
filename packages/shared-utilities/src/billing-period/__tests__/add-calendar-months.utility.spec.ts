import { addCalendarMonths } from '../add-calendar-months.utility';

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

describe('addCalendarMonths', () => {
  it('advances one calendar month', () => {
    const start = Date.UTC(2026, 0, 15);
    expect(iso(addCalendarMonths(start, 1))).toBe('2026-02-15T00:00:00.000Z');
  });

  it('clamps a 31st subscriber into a short month instead of rolling over', () => {
    const start = Date.UTC(2026, 0, 31);
    expect(iso(addCalendarMonths(start, 1))).toBe('2026-02-28T00:00:00.000Z');
  });

  it('lands on 29 February in a leap year', () => {
    const start = Date.UTC(2028, 0, 31);
    expect(iso(addCalendarMonths(start, 1))).toBe('2028-02-29T00:00:00.000Z');
  });

  it('crosses a year boundary', () => {
    const start = Date.UTC(2026, 11, 10);
    expect(iso(addCalendarMonths(start, 1))).toBe('2027-01-10T00:00:00.000Z');
  });

  it('advances three calendar months (QUARTERLY)', () => {
    const start = Date.UTC(2026, 4, 31);
    // 31 May + 3 months = 31 August (August has 31 days, no clamp needed).
    expect(iso(addCalendarMonths(start, 3))).toBe('2026-08-31T00:00:00.000Z');
  });

  it('advances six calendar months and clamps into a short month (SEMIANNUAL)', () => {
    const start = Date.UTC(2026, 7, 31);
    // 31 Aug + 6 months = 28/29 Feb, not 3 Mar.
    expect(iso(addCalendarMonths(start, 6))).toBe('2027-02-28T00:00:00.000Z');
  });

  it('advances twelve calendar months (YEARLY)', () => {
    const start = Date.UTC(2026, 5, 1);
    expect(iso(addCalendarMonths(start, 12))).toBe('2027-06-01T00:00:00.000Z');
  });

  it('clamps a 29 February start advancing twelve months into 28 February', () => {
    // A start date that only exists in a leap year: the anniversary clamps
    // exactly like every other over-length month, rather than rolling into
    // March the way naive `setUTCFullYear` arithmetic would.
    const start = Date.UTC(2028, 1, 29);
    expect(iso(addCalendarMonths(start, 12))).toBe('2029-02-28T00:00:00.000Z');
  });

  it('does not lose a day across a leap year on a twelve-month span', () => {
    const start = Date.UTC(2027, 2, 1);
    expect(iso(addCalendarMonths(start, 12))).toBe('2028-03-01T00:00:00.000Z');
  });

  it('keeps the time of day', () => {
    const start = Date.UTC(2026, 3, 10, 13, 45, 30);
    expect(iso(addCalendarMonths(start, 1))).toBe('2026-05-10T13:45:30.000Z');
  });

  it('rejects a non-positive month count', () => {
    expect(() => addCalendarMonths(Date.UTC(2026, 0, 1), 0)).toThrow();
    expect(() => addCalendarMonths(Date.UTC(2026, 0, 1), -1)).toThrow();
  });
});
