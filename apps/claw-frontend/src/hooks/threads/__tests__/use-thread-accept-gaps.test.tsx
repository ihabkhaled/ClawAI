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

const GAP_ONE = 'does not cite independent primary sources on sycophancy';
const GAP_TWO = 'repository files are not in the evidence, so claims cannot be verified';
const CONTRADICTION = 'The second section contradicts the introduction.';

const progress = makeProgress({
  failure: {
    code: 'REVIEW_NOT_PASSED',
    failedStage: 'JUDGE',
    roleId: null,
    httpStatus: null,
    retryable: true,
    phase: ThreadFailurePhase.JUDGE,
    failureClass: ThreadFailureClass.REVIEW_NOT_PASSED,
    remedies: [ThreadFailureRemedy.ACCEPT_GAPS],
    review: {
      reviewer: 'JUDGE',
      score: 84,
      minScore: 80,
      blockers: [GAP_ONE, CONTRADICTION, GAP_TWO],
      blocked: true,
      evidenceGapBlockers: [GAP_ONE, GAP_TWO],
    },
  },
});

describe('accepting evidence gaps in the retry form (ADR-194)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens on the gaps with none ticked, only the sourcing blockers offered, and no research', () => {
    const { result } = renderHook(() => useThreadRetryForm('pub-1', progress), { wrapper });

    act(() => result.current.openAcceptGaps());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.showGapPicker).toBe(true);
    expect(result.current.gapChoices).toEqual([GAP_ONE, GAP_TWO]);
    expect(result.current.acceptedGaps).toEqual([]);
    expect(result.current.refreshResearch).toBe(false);
  });

  it('sends exactly the ticked texts, no more', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRetryForm('pub-1', progress), { wrapper });
    act(() => result.current.openAcceptGaps());

    act(() => result.current.toggleGap(GAP_TWO, true));
    act(() => result.current.submit());

    await waitFor(() =>
      expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalledTimes(1),
    );
    const body = vi.mocked(threadPublicationsRepository.retryGeneration).mock.calls[0]?.[1];
    expect(body?.acceptedEvidenceGaps).toEqual([GAP_TWO]);
    expect(body).not.toHaveProperty('refreshResearch');
  });

  it('an unticked gap is not sent, and a text the review never listed cannot be sent', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRetryForm('pub-1', progress), { wrapper });
    act(() => result.current.openAcceptGaps());

    act(() => result.current.toggleGap(GAP_ONE, true));
    act(() => result.current.toggleGap(GAP_ONE, false));
    act(() => result.current.toggleGap(CONTRADICTION, true));
    act(() => result.current.toggleGap('made up text', true));

    expect(result.current.acceptedGaps).toEqual([]);
    act(() => result.current.submit());
    await waitFor(() => expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalled());
    expect(
      vi.mocked(threadPublicationsRepository.retryGeneration).mock.calls[0]?.[1],
    ).not.toHaveProperty('acceptedEvidenceGaps');
  });

  it('forgets the choices when the dialog is opened again', () => {
    const { result } = renderHook(() => useThreadRetryForm('pub-1', progress), { wrapper });
    act(() => result.current.openAcceptGaps());
    act(() => result.current.toggleGap(GAP_ONE, true));
    expect(result.current.acceptedGaps).toEqual([GAP_ONE]);

    act(() => result.current.close());
    act(() => result.current.openAcceptGaps());

    expect(result.current.acceptedGaps).toEqual([]);
  });

  it('the ordinary retry form never offers or sends gaps', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRetryForm('pub-1', progress), { wrapper });

    act(() => result.current.open());
    act(() => result.current.toggleGap(GAP_ONE, true));

    expect(result.current.showGapPicker).toBe(false);
    expect(result.current.acceptedGaps).toEqual([]);
    act(() => result.current.submit());
    await waitFor(() => expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalled());
    expect(
      vi.mocked(threadPublicationsRepository.retryGeneration).mock.calls[0]?.[1],
    ).not.toHaveProperty('acceptedEvidenceGaps');
  });

  it('offers no choice for a failure from an older service', () => {
    const { result } = renderHook(() => useThreadRetryForm('pub-1', makeProgress()), { wrapper });

    act(() => result.current.openAcceptGaps());

    expect(result.current.gapChoices).toEqual([]);
  });
});

describe('the Accept gaps remedy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens the dialog on the gaps and sends no request', () => {
    const form = {
      open: vi.fn(),
      openNarrow: vi.fn(),
      openAcceptGaps: vi.fn(),
    } as unknown as ThreadRetryFormController;
    const { result } = renderHook(() => useThreadRecoveryActions('pub-1', progress, form), {
      wrapper,
    });

    act(() => result.current.run(ThreadFailureRemedy.ACCEPT_GAPS));

    expect(form.openAcceptGaps).toHaveBeenCalledTimes(1);
    expect(form.open).not.toHaveBeenCalled();
    expect(form.openNarrow).not.toHaveBeenCalled();
    expect(threadPublicationsRepository.retryGeneration).not.toHaveBeenCalled();
  });
});
