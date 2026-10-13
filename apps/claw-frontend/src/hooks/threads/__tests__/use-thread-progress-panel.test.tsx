import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';

import { useThreadGenerationProgress } from '../use-thread-generation-progress';
import { useThreadProgressPanel } from '../use-thread-progress-panel';

vi.mock('../use-thread-generation-progress', () => ({ useThreadGenerationProgress: vi.fn() }));
vi.mock('../use-thread-retry-form', () => ({ useThreadRetryForm: () => ({ isOpen: false }) }));
vi.mock('../use-thread-delete-action', () => ({
  useThreadDeleteAction: () => ({ isOpen: false }),
}));

function mockProgress(progress: ReturnType<typeof makeProgress> | undefined) {
  vi.mocked(useThreadGenerationProgress).mockReturnValue({
    progress,
    isLoading: false,
    error: null,
    pollingPaused: false,
    pollingPausedByErrors: false,
  });
}

describe('useThreadProgressPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows retry and not cancel for a failed job', () => {
    mockProgress(makeProgress({ status: 'FAILED' }));
    const { result } = renderHook(() => useThreadProgressPanel('pub-1'));
    expect(result.current.canRetry).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });

  it('allows cancel and not retry for a running job', () => {
    mockProgress(makeProgress({ status: 'RUNNING', failure: null }));
    const { result } = renderHook(() => useThreadProgressPanel('pub-1'));
    expect(result.current.canRetry).toBe(false);
    expect(result.current.isRunning).toBe(true);
  });

  it('hides Retry when the failure says it cannot be retried', () => {
    const base = makeProgress({ status: 'FAILED' });
    const failure = base.failure;
    if (failure === null) {
      throw new Error('fixture must carry a failure');
    }
    mockProgress({ ...base, failure: { ...failure, retryable: false } });
    const { result } = renderHook(() => useThreadProgressPanel('pub-1'));
    expect(result.current.canRetry).toBe(false);
  });

  it('keeps Retry for a cancelled job that has no failure record', () => {
    mockProgress(makeProgress({ status: 'CANCELLED', failure: null }));
    const { result } = renderHook(() => useThreadProgressPanel('pub-1'));
    expect(result.current.canRetry).toBe(true);
  });

  it('offers neither before progress loads', () => {
    mockProgress(undefined);
    const { result } = renderHook(() => useThreadProgressPanel('pub-1'));
    expect(result.current.canRetry).toBe(false);
    expect(result.current.isRunning).toBe(false);
  });
});
