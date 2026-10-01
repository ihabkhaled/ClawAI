import { addTrialDays, resolveExtendedTrialEnd } from '../trial-expiry.utility';

const DAY = 86_400_000;
const now = new Date('2026-10-01T12:00:00.000Z');

describe('addTrialDays', () => {
  it('adds absolute days, whatever the length', () => {
    expect(addTrialDays(now, 30).getTime()).toBe(now.getTime() + 30 * DAY);
    expect(addTrialDays(now, 365).getTime()).toBe(now.getTime() + 365 * DAY);
  });
});

describe('resolveExtendedTrialEnd', () => {
  it('stacks onto a trial that is still running', () => {
    const end = new Date(now.getTime() + 4 * DAY);
    expect(resolveExtendedTrialEnd(end, now, 10).getTime()).toBe(end.getTime() + 10 * DAY);
  });

  it('counts from now when the trial has already lapsed', () => {
    const lapsed = new Date(now.getTime() - 20 * DAY);
    expect(resolveExtendedTrialEnd(lapsed, now, 10).getTime()).toBe(now.getTime() + 10 * DAY);
  });
});
