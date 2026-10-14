import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { FormEvent, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadModelAvailability } from '@/enums/thread-model-availability.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadRecommendedTeamResponse } from '@/types/thread-recommended-team.types';

import { useThreadGenerationForm } from '../use-thread-generation-form';

const flash = { provider: 'GEMINI', model: 'flash', displayName: 'Flash' };
const grok = { provider: 'GROK', model: 'g4', displayName: 'Grok' };
const gpt = { provider: 'OPENAI', model: 'gpt', displayName: 'GPT' };

const seat = (provider: string, model: string, other: [string, string]) => ({
  provider,
  model,
  fallbacks: [{ provider: other[0], model: other[1] }],
});

let recommendation: ThreadRecommendedTeamResponse | undefined;
let isLoadingTeam = false;

vi.mock('@/hooks/chat/use-threads', () => ({
  useThreads: () => ({ threads: [], isLoading: false }),
}));
vi.mock('@/hooks/chat/use-available-models', () => ({
  useAvailableModels: () => ({
    groupedModels: [
      { provider: 'GEMINI', label: 'Gemini', models: [flash] },
      { provider: 'GROK', label: 'Grok', models: [grok] },
      { provider: 'OPENAI', label: 'OpenAI', models: [gpt] },
    ],
    isLoading: false,
  }),
}));
vi.mock('@/hooks/threads/use-thread-recommended-team', () => ({
  useThreadRecommendedTeam: () => ({ recommendation, isLoading: isLoadingTeam }),
}));
vi.mock('@/lib/i18n', () => ({ useLocale: () => ({ locale: 'en' }) }));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    startGeneration: vi.fn().mockResolvedValue({ publicationId: 'p' }),
  },
}));

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function render() {
  return renderHook(
    () => useThreadGenerationForm({ fixedSourceThreadId: 't1', onStarted: vi.fn() }),
    { wrapper },
  );
}

describe('useThreadGenerationForm with the recommended team', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLoadingTeam = false;
    recommendation = {
      planName: 'Free',
      team: {
        authors: [
          seat('GEMINI', 'flash', ['GROK', 'g4']),
          seat('GROK', 'g4', ['GEMINI', 'flash']),
          seat('GEMINI', 'flash', ['GROK', 'g4']),
        ],
        judge: seat('GEMINI', 'flash', ['GROK', 'g4']),
        critic: seat('GROK', 'g4', ['GEMINI', 'flash']),
      },
      models: [
        { provider: 'OPENAI', model: 'gpt', status: ThreadModelAvailability.Unavailable },
        { provider: 'GEMINI', model: 'flash', status: ThreadModelAvailability.Available },
      ],
    };
  });

  it('preselects the server team, in seat order', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));
    expect(result.current.selectedModels.map(({ model }) => model)).toEqual([
      'flash',
      'g4',
      'flash',
      'flash',
      'g4',
    ]);
    expect(result.current.hasRecommendedTeam).toBe(true);
    expect(result.current.isRecommendedSelected).toBe(true);
    expect(result.current.planName).toBe('Free');
  });

  it('waits for the team before choosing, so the default does not flicker', async () => {
    isLoadingTeam = true;
    const { result } = render();

    await act(async () => Promise.resolve());

    expect(result.current.selectedModels).toHaveLength(0);
    expect(result.current.isLoadingModels).toBe(true);
  });

  it('can go back to the recommended team after a change', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));

    act(() => result.current.changeModel(0, grok));
    expect(result.current.isRecommendedSelected).toBe(false);

    act(() => result.current.resetToRecommended());
    expect(result.current.isRecommendedSelected).toBe(true);
  });

  it('falls back to its own ranking of usable models when the service gave no team', async () => {
    recommendation = {
      planName: 'Free',
      team: null,
      models: [{ provider: 'OPENAI', model: 'gpt', status: ThreadModelAvailability.Unavailable }],
    };
    const { result } = render();

    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));
    expect(result.current.selectedModels.some(({ provider }) => provider === 'OPENAI')).toBe(false);
    expect(result.current.hasRecommendedTeam).toBe(false);
  });

  it('sends the team with backups on other providers, and no unusable model as a backup', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.selectedModels).toHaveLength(5));

    act(() => result.current.setTopic('A sufficiently detailed topic'));
    act(() => result.current.setSpendCapUsd('1'));
    act(() => result.current.setHasAcknowledgedPublic(true));
    act(() =>
      result.current.submit({ preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>),
    );

    await waitFor(() => expect(threadPublicationsRepository.startGeneration).toHaveBeenCalled());
    const request = vi.mocked(threadPublicationsRepository.startGeneration).mock.calls[0]?.[0];
    expect(request?.authors[0]).toMatchObject({
      provider: 'GEMINI',
      model: 'flash',
      fallbacks: [{ provider: 'GROK', model: 'g4' }],
    });
    const everyBackup = [...(request?.authors ?? []), request?.judge, request?.critic].flatMap(
      (role) => role?.fallbacks ?? [],
    );
    expect(everyBackup.some(({ provider }) => provider === 'OPENAI')).toBe(false);
  });
});
