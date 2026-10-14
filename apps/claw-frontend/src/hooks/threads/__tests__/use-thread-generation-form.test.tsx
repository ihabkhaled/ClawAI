import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { FormEvent, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import { ApiClientError } from '@/services/shared/api-client';

import { useThreadGenerationForm } from '../use-thread-generation-form';

const models = [
  { provider: 'OPENAI', model: 'credit-model', displayName: 'Credit' },
  { provider: 'OLLAMA', model: 'included-model', displayName: 'Included' },
];

vi.mock('@/hooks/chat/use-threads', () => ({
  useThreads: () => ({ threads: [], isLoading: false }),
}));
vi.mock('@/hooks/chat/use-available-models', () => ({
  useAvailableModels: () => ({
    groupedModels: [
      { provider: 'OPENAI', label: 'OpenAI', models: [models[0]] },
      { provider: 'OLLAMA', label: 'Ollama', models: [models[1]] },
    ],
    isLoading: false,
  }),
}));
vi.mock('@/hooks/threads/use-thread-recommended-team', () => ({
  useThreadRecommendedTeam: () => ({ recommendation: undefined, isLoading: false }),
}));
vi.mock('@/lib/i18n', () => ({ useLocale: () => ({ locale: 'en' }) }));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { startGeneration: vi.fn() },
}));

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function submitEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

async function fillAndSubmit(result: {
  current: ReturnType<typeof useThreadGenerationForm>;
}): Promise<void> {
  act(() => result.current.setTopic('A sufficiently detailed topic'));
  act(() => result.current.setSpendCapUsd('1'));
  act(() => result.current.setHasAcknowledgedPublic(true));
  act(() => result.current.submit(submitEvent()));
}

describe('useThreadGenerationForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults the five roles to models the plan includes, not credit models', async () => {
    const { result } = renderHook(
      () => useThreadGenerationForm({ fixedSourceThreadId: 't1', onStarted: vi.fn() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));
    expect(result.current.selectedModels.every(({ provider }) => provider === 'OLLAMA')).toBe(true);
  });

  it('reports the status-specific start error, not a catch-all', async () => {
    vi.mocked(threadPublicationsRepository.startGeneration).mockRejectedValue(
      new ApiClientError({ message: 'pay', status: 402 }),
    );
    const { result } = renderHook(
      () => useThreadGenerationForm({ fixedSourceThreadId: 't1', onStarted: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));

    await fillAndSubmit(result);

    await waitFor(() =>
      expect(result.current.startError).toEqual({ key: 'chat.threadProgress.error.credit' }),
    );
    expect(result.current.hasError).toBe(false);
    expect(result.current.isPlanBlocked).toBe(false);
  });

  it('keeps a plan block out of the start error', async () => {
    vi.mocked(threadPublicationsRepository.startGeneration).mockRejectedValue(
      new ApiClientError({ message: 'plan', status: 403 }),
    );
    const { result } = renderHook(
      () => useThreadGenerationForm({ fixedSourceThreadId: 't1', onStarted: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));

    await fillAndSubmit(result);

    await waitFor(() => expect(result.current.isPlanBlocked).toBe(true));
    expect(result.current.startError).toBeNull();
  });

  it('shows a known refusal code as its own sentence instead of the plan block', async () => {
    vi.mocked(threadPublicationsRepository.startGeneration).mockRejectedValue(
      new ApiClientError({
        message: 'not on plan',
        status: 403,
        code: 'MODEL_NOT_ALLOWED_FOR_PLAN',
      }),
    );
    const { result } = renderHook(
      () => useThreadGenerationForm({ fixedSourceThreadId: 't1', onStarted: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));

    await fillAndSubmit(result);

    await waitFor(() =>
      expect(result.current.startError).toEqual({
        key: 'chat.threadProgress.startError.modelNotAllowedForPlan',
      }),
    );
    expect(result.current.isPlanBlocked).toBe(false);
  });

  it('flags a request that cannot be built as a validation error', async () => {
    const { result } = renderHook(
      () => useThreadGenerationForm({ fixedSourceThreadId: 't1', onStarted: vi.fn() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));

    act(() => result.current.setHasAcknowledgedPublic(true));
    act(() => result.current.submit(submitEvent()));

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(threadPublicationsRepository.startGeneration).not.toHaveBeenCalled();
  });
});
