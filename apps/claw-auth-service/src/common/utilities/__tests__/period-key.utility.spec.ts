import {
  isoWeekKey,
  secondsUntilEndOfIsoWeek,
  secondsUntilEndOfUtcDay,
  secondsUntilEndOfUtcMonth,
  utcDayKey,
  utcMonthKey,
} from '../period-key.utility';

describe('period-key utility', () => {
  describe('utcDayKey', () => {
    it('formats as YYYY-MM-DD in UTC', () => {
      expect(utcDayKey(new Date('2026-07-25T13:45:00.000Z'))).toBe('2026-07-25');
    });

    it('uses the UTC date, not the local one', () => {
      // 23:30 UTC is already the next local day east of UTC. The key must not
      // move, or a user could reset a daily counter by changing timezone.
      expect(utcDayKey(new Date('2026-07-25T23:30:00.000Z'))).toBe('2026-07-25');
    });
  });

  describe('isoWeekKey', () => {
    it('formats as YYYY-Www zero-padded', () => {
      expect(isoWeekKey(new Date('2026-01-08T00:00:00.000Z'))).toBe('2026-W02');
    });

    it('keeps a Monday and the following Sunday in the same bucket', () => {
      const monday = isoWeekKey(new Date('2026-07-20T00:00:00.000Z'));
      const sunday = isoWeekKey(new Date('2026-07-26T23:59:59.000Z'));
      expect(monday).toBe(sunday);
    });

    it('puts the next Monday in a different bucket', () => {
      expect(isoWeekKey(new Date('2026-07-26T23:59:59.000Z'))).not.toBe(
        isoWeekKey(new Date('2026-07-27T00:00:00.000Z')),
      );
    });

    it('uses the ISO week-year at a year boundary, not the calendar year', () => {
      // 2027-01-01 is a Friday, which ISO-8601 assigns to the last week of
      // 2026. Keying on the calendar year would collide two distinct weeks.
      expect(isoWeekKey(new Date('2027-01-01T00:00:00.000Z'))).toBe('2026-W53');
    });

    it('assigns 2026-01-01 to ISO week 1 of 2026', () => {
      expect(isoWeekKey(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-W01');
    });
  });

  describe('utcMonthKey', () => {
    it('formats as YYYY-MM', () => {
      expect(utcMonthKey(new Date('2026-07-25T00:00:00.000Z'))).toBe('2026-07');
    });
  });

  describe('TTL helpers', () => {
    it('counts the seconds left in the UTC day', () => {
      expect(secondsUntilEndOfUtcDay(new Date('2026-07-25T23:59:00.000Z'))).toBe(60);
    });

    it('counts the seconds left in the ISO week (through Sunday)', () => {
      // Sunday 23:59 UTC → one minute until the week rolls over.
      expect(secondsUntilEndOfIsoWeek(new Date('2026-07-26T23:59:00.000Z'))).toBe(60);
    });

    it('gives a Monday nearly a full week', () => {
      const seconds = secondsUntilEndOfIsoWeek(new Date('2026-07-20T00:00:00.000Z'));
      expect(seconds).toBe(7 * 24 * 60 * 60);
    });

    it('counts the seconds left in the UTC month', () => {
      expect(secondsUntilEndOfUtcMonth(new Date('2026-07-31T23:59:00.000Z'))).toBe(60);
    });

    it('never returns a non-positive TTL', () => {
      // A zero or negative EXPIRE would delete the counter immediately and
      // hand back a fresh allowance.
      expect(secondsUntilEndOfUtcDay(new Date('2026-07-25T23:59:59.999Z'))).toBeGreaterThan(0);
      expect(secondsUntilEndOfIsoWeek(new Date('2026-07-26T23:59:59.999Z'))).toBeGreaterThan(0);
      expect(secondsUntilEndOfUtcMonth(new Date('2026-07-31T23:59:59.999Z'))).toBeGreaterThan(0);
    });
  });
});
