import { readWindowCounter } from '../usage-view.utility';

describe('readWindowCounter', () => {
  it('treats a missing key as zero used', () => {
    // A user who has not spent anything this period simply has no counter yet.
    // That is the normal state right after a period rolls over.
    expect(readWindowCounter(null, 1000, '2026-07-26')).toEqual({
      used: 0,
      limit: 1000,
      remaining: 1000,
      periodKey: '2026-07-26',
    });
  });

  it('reports remaining against the limit', () => {
    expect(readWindowCounter('250', 1000, '2026-07-26').remaining).toBe(750);
  });

  it('never reports negative remaining after an overage', () => {
    // A reservation can overshoot slightly under concurrency. "-40 remaining"
    // renders as a nonsense bar; zero is both true and readable.
    expect(readWindowCounter('1040', 1000, '2026-07-26').remaining).toBe(0);
  });

  it('leaves remaining null for an unlimited window', () => {
    // Inventing a remaining figure for an unlimited window makes the UI draw a
    // bar that can only ever be wrong.
    const window = readWindowCounter('9000', null, '2026-07-26');

    expect(window.limit).toBeNull();
    expect(window.remaining).toBeNull();
    expect(window.used).toBe(9000);
  });

  it('keeps a disabled window distinct from an unlimited one', () => {
    // limit 0 means the plan does not include this. It must not read as
    // unlimited, which is the opposite claim.
    expect(readWindowCounter(null, 0, '2026-07-26')).toEqual({
      used: 0,
      limit: 0,
      remaining: 0,
      periodKey: '2026-07-26',
    });
  });

  it('reads a corrupt counter as zero rather than NaN', () => {
    // NaN would propagate through every arithmetic below and render to the
    // user as "NaN of 1,000".
    expect(readWindowCounter('not-a-number', 1000, '2026-07-26').used).toBe(0);
    expect(readWindowCounter('', 1000, '2026-07-26').used).toBe(0);
  });

  it('ignores a negative counter', () => {
    expect(readWindowCounter('-5', 1000, '2026-07-26').used).toBe(0);
  });

  it('carries the period key through so a stale render is recognisable', () => {
    expect(readWindowCounter('10', 100, '2026-W30').periodKey).toBe('2026-W30');
  });
});
