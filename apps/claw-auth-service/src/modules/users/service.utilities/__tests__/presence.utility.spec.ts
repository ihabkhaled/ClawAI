import { PresenceFilter, PresenceState } from '../../../../common/enums';
import { presenceCutoff, resolvePresence } from '../presence.utility';

const NOW = new Date('2026-10-31T12:00:00.000Z');
const ago = (ms: number): Date => new Date(NOW.getTime() - ms);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('resolvePresence', () => {
  it('is OFFLINE for a user who was never seen', () => {
    expect(resolvePresence(null, NOW)).toBe(PresenceState.OFFLINE);
  });

  it.each([
    [0, PresenceState.ONLINE],
    [4 * MINUTE + 59_000, PresenceState.ONLINE],
    [5 * MINUTE, PresenceState.ONLINE],
    [5 * MINUTE + 1, PresenceState.RECENT],
    [3 * HOUR, PresenceState.RECENT],
    [24 * HOUR, PresenceState.RECENT],
    [24 * HOUR + 1, PresenceState.OFFLINE],
    [10 * 24 * HOUR, PresenceState.OFFLINE],
  ])('last seen %i ms ago is %s', (age, expected) => {
    expect(resolvePresence(ago(age), NOW)).toBe(expected);
  });
});

describe('presenceCutoff', () => {
  it('is five minutes back for ONLINE and 24 hours back for ACTIVE_24H', () => {
    expect(presenceCutoff(PresenceFilter.ONLINE, NOW)).toEqual(ago(5 * MINUTE));
    expect(presenceCutoff(PresenceFilter.ACTIVE_24H, NOW)).toEqual(ago(24 * HOUR));
  });
});
