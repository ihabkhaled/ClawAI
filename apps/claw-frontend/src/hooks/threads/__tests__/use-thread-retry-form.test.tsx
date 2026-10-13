import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';

import { useThreadRetryForm } from '../use-thread-retry-form';

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { retryGeneration: vi.fn() },
}));

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useThreadRetryForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens pre-filled from the failed job and lists only editable roles', () => {
    const { result } = renderHook(() => useThreadRetryForm('pub-1', makeProgress()), { wrapper });

    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.topic).toBe('How heat pumps work');
    expect(result.current.spendCapUsd).toBe('1');
    expect(result.current.roles.map((role) => role.roleId)).toEqual([
      'author-1',
      'judge',
      'critic',
    ]);
  });

  it('submits only what changed, with a fresh idempotency key', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockResolvedValue({
      jobId: 'job-2',
      status: 'QUEUED',
    });
    const { result } = renderHook(() => useThreadRetryForm('pub-1', makeProgress()), { wrapper });
    act(() => result.current.open());
    act(() => result.current.setTopic('A better topic for heat pumps'));
    act(() => result.current.setSpendCapUsd('3'));
    act(() =>
      result.current.changeModel('judge', { provider: 'GEMINI', model: 'g', displayName: 'G' }),
    );

    act(() => result.current.submit());

    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(threadPublicationsRepository.retryGeneration).toHaveBeenCalledWith(
      'pub-1',
      expect.objectContaining({
        topic: 'A better topic for heat pumps',
        spendCapUsd: 3,
        models: [{ roleId: 'judge', provider: 'GEMINI', model: 'g' }],
        idempotencyKey: expect.any(String),
      }),
    );
  });

  it('shows a status-specific error and stays open when the retry fails', async () => {
    vi.mocked(threadPublicationsRepository.retryGeneration).mockRejectedValue(
      new ApiClientError({ message: 'pay', status: 402 }),
    );
    const { result } = renderHook(() => useThreadRetryForm('pub-1', makeProgress()), { wrapper });
    act(() => result.current.open());

    act(() => result.current.submit());

    await waitFor(() =>
      expect(result.current.error).toEqual({ key: 'chat.threadProgress.error.credit' }),
    );
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it('refuses to submit before the failed job is loaded', async () => {
    const { result } = renderHook(() => useThreadRetryForm('pub-1', undefined), { wrapper });
    act(() => result.current.open());
    expect(result.current.roles).toEqual([]);
    expect(result.current.topic).toBe('');

    act(() => result.current.submit());

    await waitFor(() =>
      expect(result.current.error).toEqual({ key: 'chat.threadProgress.error.generic' }),
    );
    expect(threadPublicationsRepository.retryGeneration).not.toHaveBeenCalled();
  });
});
