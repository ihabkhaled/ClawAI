import { ThreadFailureClass, ThreadFailurePhase, ThreadFailureRemedy } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { threadRecommendedTeamRepository } from '@/repositories/threads/thread-recommended-team.repository';
import type { ThreadRetryFormController } from '@/types/thread-generation-progress.types';

import { useThreadRecoveryActions } from '../use-thread-recovery-actions';

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

const progress = makeProgress({
  failure: {
    code: 'OUTPUT_INVALID',
    failedStage: 'AUTHOR_DRAFTS',
    roleId: 'author-1',
    httpStatus: null,
    retryable: true,
    phase: ThreadFailurePhase.AUTHOR,
    failureClass: ThreadFailureClass.WRONG_SHAPE,
    remedies: [
      ThreadFailureRemedy.TRY_SUGGESTED_MODEL,
      ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL,
      ThreadFailureRemedy.USE_RECOMMENDED_TEAM,
    ],
    suggestedModel: { provider: 'GEMINI', model: 'flash' },
  },
});

describe('useThreadRecoveryActions (ADR-181)', () => {
  beforeEach(() => vi.clearAllMocks());

  const form = () => ({ open: vi.fn() }) as unknown as ThreadRetryFormController;

  it('retries with only the failed role changed for the suggested model', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRecoveryActions('pub-1', progress, form()), {
      wrapper,
    });

    act(() => result.current.run(ThreadFailureRemedy.TRY_SUGGESTED_MODEL));

    await waitFor(() =>
      expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalledWith(
        'pub-1',
        expect.objectContaining({
          models: [{ roleId: 'author-1', provider: 'GEMINI', model: 'flash' }],
        }),
      ),
    );
  });

  it('opens the retry form for a remedy that needs a choice and sends nothing', () => {
    const retryForm = form();
    const { result } = renderHook(() => useThreadRecoveryActions('pub-1', progress, retryForm), {
      wrapper,
    });

    act(() => result.current.run(ThreadFailureRemedy.CHOOSE_ANOTHER_MODEL));

    expect(retryForm.open).toHaveBeenCalled();
    expect(threadPublicationsRepository.retryGeneration).not.toHaveBeenCalled();
  });

  it('reads the recommended team and retries every role with it', async () => {
    vi.mocked(threadRecommendedTeamRepository.get).mockResolvedValue({
      planName: 'Pro',
      models: [],
      team: {
        authors: [{ provider: 'GROK', model: 'a1', fallbacks: [] }],
        judge: { provider: 'GEMINI', model: 'j', fallbacks: [] },
        critic: { provider: 'NVIDIA', model: 'c', fallbacks: [] },
      },
    });
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRecoveryActions('pub-1', progress, form()), {
      wrapper,
    });

    act(() => result.current.run(ThreadFailureRemedy.USE_RECOMMENDED_TEAM));

    await waitFor(() =>
      expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalledWith(
        'pub-1',
        expect.objectContaining({
          models: expect.arrayContaining([{ roleId: 'judge', provider: 'GEMINI', model: 'j' }]),
        }),
      ),
    );
  });

  it('falls back to the form when the account has no recommended team', async () => {
    vi.mocked(threadRecommendedTeamRepository.get).mockResolvedValue({
      planName: 'Free',
      models: [],
      team: null,
    });
    const retryForm = form();
    const { result } = renderHook(() => useThreadRecoveryActions('pub-1', progress, retryForm), {
      wrapper,
    });

    act(() => result.current.run(ThreadFailureRemedy.USE_RECOMMENDED_TEAM));

    await waitFor(() => expect(retryForm.open).toHaveBeenCalled());
    expect(threadPublicationsRepository.retryGeneration).not.toHaveBeenCalled();
  });

  it('offers nothing before the job has loaded or for a remedy that is not shown', () => {
    const { result } = renderHook(() => useThreadRecoveryActions('pub-1', undefined, form()), {
      wrapper,
    });
    expect(result.current.actions).toEqual([]);
    act(() => result.current.run(ThreadFailureRemedy.TRY_AGAIN));
    expect(threadPublicationsRepository.retryGeneration).not.toHaveBeenCalled();
  });
});
