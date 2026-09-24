import { afterEach, describe, expect, it } from 'vitest';

import { MILLISECONDS_PER_TRIAL_DAY } from '@/constants/trial-status.constants';
import { TrialBannerDismissalChoice } from '@/enums/trial-banner-dismissal.enum';
import {
  buildTrialBannerDismissal,
  isTrialBannerSuppressed,
  parseTrialBannerDismissal,
  readTrialBannerDismissalRaw,
  trialBannerDismissalKey,
  writeTrialBannerDismissal,
} from '@/utilities/trial-banner-dismissal.utility';

const NOW = Date.parse('2026-09-24T12:00:00.000Z');

describe('trial banner dismissal utility', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('hide forever suppresses the banner while more than 1 day is left', () => {
    const record = buildTrialBannerDismissal(TrialBannerDismissalChoice.HIDE_FOREVER, NOW);
    expect(record.until).toBeNull();
    expect(isTrialBannerSuppressed(record, 20, NOW)).toBe(true);
    expect(isTrialBannerSuppressed(record, 2, NOW)).toBe(true);
  });

  it('hide forever gives way on the last day', () => {
    const record = buildTrialBannerDismissal(TrialBannerDismissalChoice.HIDE_FOREVER, NOW);
    expect(isTrialBannerSuppressed(record, 1, NOW)).toBe(false);
    expect(isTrialBannerSuppressed(record, 0, NOW)).toBe(false);
  });

  it('snooze for 1 day suppresses until it expires, then the banner returns', () => {
    const record = buildTrialBannerDismissal(TrialBannerDismissalChoice.REMIND_IN_ONE_DAY, NOW);
    expect(record.until).toBe(NOW + MILLISECONDS_PER_TRIAL_DAY);
    expect(isTrialBannerSuppressed(record, 20, NOW + MILLISECONDS_PER_TRIAL_DAY - 1)).toBe(true);
    expect(isTrialBannerSuppressed(record, 20, NOW + MILLISECONDS_PER_TRIAL_DAY)).toBe(false);
  });

  it('snooze for 7 days reappears once 3 or fewer days are left', () => {
    const record = buildTrialBannerDismissal(TrialBannerDismissalChoice.REMIND_IN_SEVEN_DAYS, NOW);
    expect(record.until).toBe(NOW + 7 * MILLISECONDS_PER_TRIAL_DAY);
    expect(isTrialBannerSuppressed(record, 4, NOW)).toBe(true);
    expect(isTrialBannerSuppressed(record, 3, NOW)).toBe(false);
  });

  it('shows the banner when nothing was dismissed', () => {
    expect(isTrialBannerSuppressed(null, 20, NOW)).toBe(false);
  });

  it('isolates the stored choice per user', () => {
    writeTrialBannerDismissal('user-a', TrialBannerDismissalChoice.HIDE_FOREVER, NOW);
    expect(trialBannerDismissalKey('user-a')).not.toBe(trialBannerDismissalKey('user-b'));
    expect(parseTrialBannerDismissal(readTrialBannerDismissalRaw('user-a'))).toEqual({
      until: null,
    });
    expect(readTrialBannerDismissalRaw('user-b')).toBeNull();
  });

  it('ignores a malformed or hand-edited stored value', () => {
    expect(parseTrialBannerDismissal('not json')).toBeNull();
    expect(parseTrialBannerDismissal('{"until":"soon"}')).toBeNull();
    expect(parseTrialBannerDismissal('[]')).toBeNull();
    expect(parseTrialBannerDismissal(null)).toBeNull();
  });
});
