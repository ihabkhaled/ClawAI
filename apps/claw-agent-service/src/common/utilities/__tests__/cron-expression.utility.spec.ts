import {
  nextRunForStoredCron,
  parseCron,
  validateCronForRoutine,
} from '../cron-expression.utility';

const at = (iso: string): number => Date.parse(iso);

describe('parseCron', () => {
  it('reads lists, ranges, steps and Sunday as 0 or 7', () => {
    const parsed = parseCron('0,30 9-17/4 * * 0,7');
    expect(parsed.parsed).toBe(true);
    if (parsed.parsed) {
      expect([...parsed.fields.minutes]).toEqual([0, 30]);
      expect([...parsed.fields.hours]).toEqual([9, 13, 17]);
      expect([...parsed.fields.daysOfWeek]).toEqual([0]);
    }
  });

  it.each(['', '* * * *', '* * * * * *', '60 * * * *', '*/0 * * * *', 'a * * * *', '@daily'])(
    'refuses %j',
    (bad) => {
      expect(parseCron(bad).parsed).toBe(false);
    },
  );
});

describe('nextRunForStoredCron (UTC)', () => {
  it('finds the next matching minute strictly after now', () => {
    expect(nextRunForStoredCron('30 9 * * *', at('2026-10-01T09:30:00Z'))).toBe(
      at('2026-10-02T09:30:00Z'),
    );
    expect(nextRunForStoredCron('30 9 * * *', at('2026-10-01T08:00:00Z'))).toBe(
      at('2026-10-01T09:30:00Z'),
    );
  });

  it('honours day-of-week and either-day-field semantics', () => {
    // 2026-10-01 is a Thursday; the next Monday is 2026-10-05.
    expect(nextRunForStoredCron('0 0 * * 1', at('2026-10-01T00:00:00Z'))).toBe(
      at('2026-10-05T00:00:00Z'),
    );
    expect(nextRunForStoredCron('0 0 15 * 1', at('2026-10-01T00:00:00Z'))).toBe(
      at('2026-10-05T00:00:00Z'),
    );
  });

  it('returns undefined for a date that never exists', () => {
    expect(nextRunForStoredCron('0 0 31 2 *', at('2026-10-01T00:00:00Z'))).toBeUndefined();
  });
});

describe('validateCronForRoutine', () => {
  const now = at('2026-10-01T00:00:00Z');

  it('accepts a five-minute cadence and normalises whitespace', () => {
    const result = validateCronForRoutine('  */5   * * * * ', now);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.expression).toBe('*/5 * * * *');
  });

  it('refuses anything more frequent than every five minutes', () => {
    expect(validateCronForRoutine('* * * * *', now).valid).toBe(false);
    expect(validateCronForRoutine('*/4 * * * *', now).valid).toBe(false);
  });

  it('refuses an expression with no real date, with a readable reason', () => {
    const result = validateCronForRoutine('0 0 31 2 *', now);
    expect(result).toEqual({ valid: false, reason: expect.stringContaining('never matches') });
  });
});
