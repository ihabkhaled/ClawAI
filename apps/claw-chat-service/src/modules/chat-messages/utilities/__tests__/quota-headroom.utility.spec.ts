import { QuotaWindow } from '@claw/shared-types';
import { resolveQuotaHeadroom } from '../quota-headroom.utility';

const limited = (used: number) => ({
  dailyLimit: 20_000,
  used,
  unlimited: false,
  adminBypass: false,
});

describe('resolveQuotaHeadroom', () => {
  it('caps the reply to exactly what is left', () => {
    // The whole point: the model cannot spend more than the user still has.
    const headroom = resolveQuotaHeadroom(limited(15_000), 1_000);
    expect(headroom.allowed).toBe(true);
    expect(headroom.maxOutputTokens).toBe(4_000);
  });

  it('refuses when the PROMPT alone does not fit', () => {
    // 19,999 used, a 1,656-token reply: the exact overrun measured in
    // production. Refused here instead of discovered afterwards.
    const headroom = resolveQuotaHeadroom(limited(19_999), 20);
    expect(headroom.allowed).toBe(false);
    expect(headroom.maxOutputTokens).toBe(0);
  });

  it('refuses when the allowance is already spent', () => {
    expect(resolveQuotaHeadroom(limited(20_000), 10).allowed).toBe(false);
    expect(resolveQuotaHeadroom(limited(25_000), 10).allowed).toBe(false);
  });

  it('refuses a stub rather than clamping to a fragment', () => {
    // 20 tokens left after the prompt is not an answer; "you are out of
    // tokens" is a better outcome than a sentence that stops mid-word.
    const headroom = resolveQuotaHeadroom(limited(19_900), 80);
    expect(headroom.allowed).toBe(false);
  });

  it('allows exactly at the useful floor', () => {
    const headroom = resolveQuotaHeadroom(limited(19_900), 36);
    expect(headroom.allowed).toBe(true);
    expect(headroom.maxOutputTokens).toBe(64);
  });

  it('never caps an unlimited or admin account', () => {
    for (const quota of [
      { dailyLimit: 0, used: 999_999, unlimited: true, adminBypass: false },
      { dailyLimit: 0, used: 999_999, unlimited: false, adminBypass: true },
    ]) {
      const headroom = resolveQuotaHeadroom(quota, 5_000);
      expect(headroom.allowed).toBe(true);
      expect(headroom.maxOutputTokens).toBeNull();
    }
  });

  it('can never return a cap that would take the user over', () => {
    // The invariant, stated as arithmetic: used + prompt + cap <= limit.
    for (const used of [0, 1, 5_000, 19_000, 19_935]) {
      for (const prompt of [0, 1, 100, 1_000]) {
        const headroom = resolveQuotaHeadroom(limited(used), prompt);
        if (headroom.allowed && headroom.maxOutputTokens !== null) {
          expect(used + prompt + headroom.maxOutputTokens).toBeLessThanOrEqual(20_000);
        }
      }
    }
  });
});

describe('resolveQuotaHeadroom across windows', () => {
  const withWindows = (windows: { window: QuotaWindow; limit: number | null; used: number }[]) => ({
    dailyLimit: 20_000,
    used: 0,
    unlimited: false,
    adminBypass: false,
    windows,
  });

  it('refuses on the MONTH when the day still has room', () => {
    const headroom = resolveQuotaHeadroom(
      withWindows([
        { window: QuotaWindow.DAY, limit: 20_000, used: 0 },
        { window: QuotaWindow.WEEK, limit: 100_000, used: 10_000 },
        { window: QuotaWindow.MONTH, limit: 300_000, used: 300_000 },
      ]),
      50,
    );
    expect(headroom.allowed).toBe(false);
    expect(headroom.window).toBe(QuotaWindow.MONTH);
  });

  it('sizes the output ceiling to the TIGHTEST window, not the day', () => {
    const headroom = resolveQuotaHeadroom(
      withWindows([
        { window: QuotaWindow.DAY, limit: 20_000, used: 0 },
        { window: QuotaWindow.WEEK, limit: 100_000, used: 99_000 },
        { window: QuotaWindow.MONTH, limit: 300_000, used: 0 },
      ]),
      100,
    );
    expect(headroom.allowed).toBe(true);
    expect(headroom.maxOutputTokens).toBe(900);
    expect(headroom.window).toBe(QuotaWindow.WEEK);
  });

  it('skips an unlimited window instead of treating null as zero', () => {
    const headroom = resolveQuotaHeadroom(
      withWindows([
        { window: QuotaWindow.DAY, limit: 20_000, used: 1_000 },
        { window: QuotaWindow.WEEK, limit: null, used: 900_000 },
        { window: QuotaWindow.MONTH, limit: null, used: 900_000 },
      ]),
      100,
    );
    expect(headroom.allowed).toBe(true);
    expect(headroom.window).toBe(QuotaWindow.DAY);
  });

  it('falls back to the day figures when windows are absent', () => {
    // An older auth-service sends no `windows` array. That must not read as
    // "no limits".
    expect(resolveQuotaHeadroom(limited(20_000), 10).allowed).toBe(false);
  });
});
