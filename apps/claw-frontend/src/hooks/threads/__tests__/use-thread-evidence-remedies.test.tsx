import { ThreadFailureClass, ThreadFailurePhase, ThreadFailureRemedy } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadRetryFormController } from '@/types/thread-generation-progress.types';

import { useThreadRecoveryActions } from '../use-thread-recovery-actions';
import { useThreadRetryForm } from '../use-thread-retry-form';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { retryGeneration: vi.fn() },
}));
vi.mock('@/repositories/threads/thread-recommended-team.repository', () => ({
  threadRecommendedTeamRepository: { get: vi.fn() },
}));

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const gapProgress = makeProgress({
  failure: {
    code: 'REVIEW_NOT_PASSED',
    failedStage: 'JUDGE',
    roleId: null,
    httpStatus: null,
    retryable: true,
    phase: ThreadFailurePhase.JUDGE,
    failureClass: ThreadFailureClass.EVIDENCE_GAP,
    remedies: [ThreadFailureRemedy.RESEARCH_MORE, ThreadFailureRemedy.NARROW_CLAIMS],
  },
});

describe('the retry form research option (ADR-193)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is ticked by default after an evidence-gap failure and sent with the retry', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRetryForm('pub-1', gapProgress), { wrapper });

    act(() => result.current.open());
    expect(result.current.refreshResearch).toBe(true);
    expect(result.current.showNarrowHint).toBe(false);
    act(() => result.current.submit());

    await waitFor(() =>
      expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalledWith(
        'pub-1',
        expect.objectContaining({ refreshResearch: true }),
      ),
    );
  });

  it('is off for any other failure, and omitted from the request until ticked', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRetryForm('pub-1', makeProgress()), { wrapper });

    act(() => result.current.open());
    expect(result.current.refreshResearch).toBe(false);
    act(() => result.current.submit());

    await waitFor(() => expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalled());
    const body = vi.mocked(threadPublicationsRepository.retryGeneration).mock.calls[0]?.[1];
    expect(body).not.toHaveProperty('refreshResearch');
  });

  it('can be ticked by hand', async () => {
    const { result } = renderHook(() => useThreadRetryForm('pub-1', makeProgress()), { wrapper });
    act(() => result.current.open());

    act(() => result.current.setRefreshResearch(true));

    expect(result.current.refreshResearch).toBe(true);
  });

  it('opens to narrow the claims: hint shown, research not pre-selected, topic focused', () => {
    const { result } = renderHook(() => useThreadRetryForm('pub-1', gapProgress), { wrapper });
    const textarea = document.createElement('textarea');
    const focus = vi.spyOn(textarea, 'focus');
    result.current.topicRef.current = textarea;

    act(() => result.current.openNarrow());
    const prevent = vi.fn();
    act(() => result.current.onOpenAutoFocus({ preventDefault: prevent } as unknown as Event));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.showNarrowHint).toBe(true);
    expect(result.current.refreshResearch).toBe(false);
    expect(prevent).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });

  it('leaves the dialog default focus alone when it was not opened to narrow', () => {
    const { result } = renderHook(() => useThreadRetryForm('pub-1', gapProgress), { wrapper });
    act(() => result.current.open());
    const prevent = vi.fn();

    act(() => result.current.onOpenAutoFocus({ preventDefault: prevent } as unknown as Event));

    expect(prevent).not.toHaveBeenCalled();
  });
});

describe('the evidence-gap remedies', () => {
  beforeEach(() => vi.clearAllMocks());

  const form = () =>
    ({ open: vi.fn(), openNarrow: vi.fn() }) as unknown as ThreadRetryFormController;

  it('"Research more" retries in one click with a fresh research pass', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRecoveryActions('pub-1', gapProgress, form()), {
      wrapper,
    });

    act(() => result.current.run(ThreadFailureRemedy.RESEARCH_MORE));

    await waitFor(() =>
      expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalledWith(
        'pub-1',
        expect.objectContaining({ refreshResearch: true }),
      ),
    );
  });

  it('"Narrow the claims" opens the form on the topic and sends nothing', () => {
    const retryForm = form();
    const { result } = renderHook(() => useThreadRecoveryActions('pub-1', gapProgress, retryForm), {
      wrapper,
    });

    act(() => result.current.run(ThreadFailureRemedy.NARROW_CLAIMS));

    expect(retryForm.openNarrow).toHaveBeenCalled();
    expect(retryForm.open).not.toHaveBeenCalled();
    expect(threadPublicationsRepository.retryGeneration).not.toHaveBeenCalled();
  });
});
