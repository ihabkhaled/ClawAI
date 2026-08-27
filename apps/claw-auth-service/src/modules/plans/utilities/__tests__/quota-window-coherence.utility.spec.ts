import { QuotaWindow } from '@claw/shared-types';

import {
  describeQuotaWindowConflicts,
  findQuotaWindowConflicts,
} from '../quota-window-coherence.utility';

describe('findQuotaWindowConflicts', () => {
  it('accepts a ladder that widens as the window lengthens', () => {
    expect(
      findQuotaWindowConflicts({
        dailyTokenQuota: 100_000,
        weeklyTokenQuota: 600_000,
        monthlyTokenQuota: 1_750_000,
      }),
    ).toEqual([]);
  });

  it('rejects a daily cap the weekly ceiling makes unreachable', () => {
    // The shape the live Free plan actually shipped: the card advertised
    // 300,000 a day while the account granted 20,000 for the whole week.
    const conflicts = findQuotaWindowConflicts({
      dailyTokenQuota: 300_000,
      weeklyTokenQuota: 20_000,
    });

    expect(conflicts).toEqual([
      {
        shorter: QuotaWindow.DAY,
        longer: QuotaWindow.WEEK,
        shorterValue: 300_000,
        longerValue: 20_000,
      },
    ]);
  });

  it('reports every broken rung, not only the first', () => {
    const conflicts = findQuotaWindowConflicts({
      dailyTokenQuota: 300_000,
      weeklyTokenQuota: 20_000,
      monthlyTokenQuota: 10_000,
    });

    expect(conflicts).toHaveLength(2);
  });

  it('treats null as unlimited rather than as a smaller number', () => {
    // An unlimited weekly window above a finite daily one is the normal shape
    // for the top plans; failing it would make "unlimited" unsettable.
    expect(
      findQuotaWindowConflicts({ dailyTokenQuota: 5_000_000, weeklyTokenQuota: null }),
    ).toEqual([]);
  });

  it('leaves a disabled window alone', () => {
    // 0 means disabled, which blocks everything below it. That is a deliberate
    // setting, not an ordering mistake.
    expect(findQuotaWindowConflicts({ dailyTokenQuota: 100, weeklyTokenQuota: 0 })).toEqual([]);
  });

  it('compares nothing when only one window is set', () => {
    expect(findQuotaWindowConflicts({ dailyTokenQuota: 300_000 })).toEqual([]);
    expect(findQuotaWindowConflicts({})).toEqual([]);
  });

  it('skips the pair around an absent middle window', () => {
    // Daily and monthly are not adjacent rungs, so a missing weekly cap leaves
    // nothing to compare rather than silently pairing across the gap.
    expect(
      findQuotaWindowConflicts({ dailyTokenQuota: 900_000, monthlyTokenQuota: 100_000 }),
    ).toEqual([]);
  });
});

describe('describeQuotaWindowConflicts', () => {
  it('names both numbers, so the operator can see which one to move', () => {
    const message = describeQuotaWindowConflicts(
      findQuotaWindowConflicts({ dailyTokenQuota: 300_000, weeklyTokenQuota: 20_000 }),
    );

    expect(message).toContain('300000');
    expect(message).toContain('20000');
  });

  it('is empty when nothing is wrong', () => {
    expect(describeQuotaWindowConflicts([])).toBe('');
  });
});
