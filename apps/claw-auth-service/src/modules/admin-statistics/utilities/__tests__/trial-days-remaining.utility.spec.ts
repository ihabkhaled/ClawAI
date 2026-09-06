import { resolveTrialDaysRemaining } from '../trial-days-remaining.utility';

describe('resolveTrialDaysRemaining', () => {
  const NOW = new Date('2026-09-06T12:00:00.000Z');

  it('counts a partial day as a whole remaining day', () => {
    // Thirty minutes left. Rounding down would report 0, which reads as expired
    // on a trial that still works.
    expect(resolveTrialDaysRemaining(new Date('2026-09-06T12:30:00.000Z'), NOW)).toBe(1);
  });

  it('reports an exact multiple of a day without inflating it', () => {
    expect(resolveTrialDaysRemaining(new Date('2026-09-13T12:00:00.000Z'), NOW)).toBe(7);
  });

  it('rounds a fractional remainder up', () => {
    expect(resolveTrialDaysRemaining(new Date('2026-09-13T18:00:00.000Z'), NOW)).toBe(8);
  });

  it('returns 0 at the exact expiry instant', () => {
    expect(resolveTrialDaysRemaining(new Date('2026-09-06T12:00:00.000Z'), NOW)).toBe(0);
  });

  it('floors an already-expired trial at 0 rather than going negative', () => {
    expect(resolveTrialDaysRemaining(new Date('2026-08-01T12:00:00.000Z'), NOW)).toBe(0);
  });

  it('measures elapsed time, so a DST transition does not shift the answer', () => {
    // Europe/London springs forward on 2027-03-28. The trial is a fixed
    // duration from its grant and never observed that transition, so 30 days
    // of elapsed time must still read as 30 days.
    const from = new Date('2027-03-14T12:00:00.000Z');
    const to = new Date('2027-04-13T12:00:00.000Z');

    expect(resolveTrialDaysRemaining(to, from)).toBe(30);
  });
});
