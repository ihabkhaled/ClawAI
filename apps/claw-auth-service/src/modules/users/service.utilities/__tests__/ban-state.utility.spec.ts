import { BanDurationUnit } from '../../../../common/enums';
import { BAN_MAX_DURATION_MS } from '../../constants/user-admin.constants';
import { computeBannedUntil, resolveBanState } from '../ban-state.utility';

const NOW = new Date('2026-10-31T12:00:00.000Z');

describe('resolveBanState', () => {
  it('is NONE when the account was never banned', () => {
    expect(resolveBanState({ bannedAt: null, bannedUntil: null }, NOW)).toEqual({ status: 'NONE' });
  });

  it('is an ACTIVE permanent ban when bannedAt is set and bannedUntil is null', () => {
    expect(resolveBanState({ bannedAt: NOW, bannedUntil: null }, NOW)).toEqual({
      status: 'ACTIVE',
      permanent: true,
      until: null,
    });
  });

  it('is ACTIVE until the end of a timed ban, one millisecond before it', () => {
    const until = new Date(NOW.getTime() + 1);
    expect(resolveBanState({ bannedAt: NOW, bannedUntil: until }, NOW)).toEqual({
      status: 'ACTIVE',
      permanent: false,
      until,
    });
  });

  it('is EXPIRED exactly at the end instant and after it (the ban lifts itself)', () => {
    expect(resolveBanState({ bannedAt: NOW, bannedUntil: NOW }, NOW)).toEqual({
      status: 'EXPIRED',
    });
    const later = new Date(NOW.getTime() + 60_000);
    expect(resolveBanState({ bannedAt: NOW, bannedUntil: NOW }, later).status).toBe('EXPIRED');
  });
});

describe('computeBannedUntil', () => {
  it.each([
    [BanDurationUnit.MINUTES, 1, 60_000],
    [BanDurationUnit.HOURS, 2, 7_200_000],
    [BanDurationUnit.DAYS, 3, 259_200_000],
  ])('adds %s x %i to now', (unit, amount, ms) => {
    expect(computeBannedUntil(unit, amount, NOW)?.getTime()).toBe(NOW.getTime() + ms);
  });

  it('returns null for LIFETIME and ignores any amount', () => {
    expect(computeBannedUntil(BanDurationUnit.LIFETIME, undefined, NOW)).toBeNull();
    expect(computeBannedUntil(BanDurationUnit.LIFETIME, 5, NOW)).toBeNull();
  });

  it.each([undefined, 0, -1, 1.5, Number.NaN])('rejects a timed ban with amount %s', (amount) => {
    expect(() => computeBannedUntil(BanDurationUnit.DAYS, amount, NOW)).toThrow(RangeError);
  });

  it('rejects a timed ban longer than ten years', () => {
    const days = Math.ceil(BAN_MAX_DURATION_MS / 86_400_000) + 1;
    expect(() => computeBannedUntil(BanDurationUnit.DAYS, days, NOW)).toThrow(/ten years/);
  });
});
