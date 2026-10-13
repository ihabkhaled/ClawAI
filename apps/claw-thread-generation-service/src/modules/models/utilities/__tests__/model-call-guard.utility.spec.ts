import { createModelCallGuard } from '../model-call-guard.utility';

describe('createModelCallGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts as idle after the silence limit', () => {
    const guard = createModelCallGuard({ idleMs: 1_000, maxMs: 10_000 });

    vi.advanceTimersByTime(999);
    expect(guard.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);

    expect(guard.signal.aborted).toBe(true);
    expect(guard.cause()).toBe('idle');
    guard.dispose();
  });

  it('restarts the silence limit whenever bytes arrive', () => {
    const guard = createModelCallGuard({ idleMs: 1_000, maxMs: 10_000 });

    for (let step = 0; step < 5; step += 1) {
      vi.advanceTimersByTime(900);
      guard.touch();
    }

    expect(guard.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1_000);
    expect(guard.cause()).toBe('idle');
    guard.dispose();
  });

  it('aborts at the ceiling even while bytes keep arriving', () => {
    const guard = createModelCallGuard({ idleMs: 1_000, maxMs: 5_000 });

    for (let step = 0; step < 5; step += 1) {
      vi.advanceTimersByTime(900);
      guard.touch();
    }
    expect(guard.signal.aborted).toBe(false);
    vi.advanceTimersByTime(500);
    guard.touch();

    expect(guard.cause()).toBe('ceiling');
    guard.dispose();
  });

  it('aborts as cancelled, with the job reason, when the job signal aborts', () => {
    const job = new AbortController();
    const guard = createModelCallGuard({ idleMs: 1_000, maxMs: 10_000, cancelSignal: job.signal });
    const reason = new Error('job cancelled');

    job.abort(reason);

    expect(guard.cause()).toBe('cancelled');
    expect(guard.signal.reason).toBe(reason);
    guard.dispose();
  });

  it('starts aborted when the job signal already was', () => {
    const job = new AbortController();
    job.abort();

    const guard = createModelCallGuard({ idleMs: 1_000, maxMs: 10_000, cancelSignal: job.signal });

    expect(guard.cause()).toBe('cancelled');
    guard.dispose();
  });

  it('keeps the first cause when several fire', () => {
    const job = new AbortController();
    const guard = createModelCallGuard({ idleMs: 1_000, maxMs: 10_000, cancelSignal: job.signal });

    vi.advanceTimersByTime(1_000);
    job.abort();
    guard.touch();

    expect(guard.cause()).toBe('idle');
    guard.dispose();
  });

  it('stops watching silence once disabled, but never the ceiling', () => {
    const guard = createModelCallGuard({ idleMs: 1_000, maxMs: 5_000 });

    guard.disableIdle();
    guard.touch();
    vi.advanceTimersByTime(4_999);
    expect(guard.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);

    expect(guard.cause()).toBe('ceiling');
    guard.dispose();
  });

  it('leaves no timer or listener behind once disposed', () => {
    const job = new AbortController();
    const guard = createModelCallGuard({ idleMs: 1_000, maxMs: 5_000, cancelSignal: job.signal });

    guard.dispose();
    job.abort();
    vi.advanceTimersByTime(10_000);

    expect(guard.cause()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
