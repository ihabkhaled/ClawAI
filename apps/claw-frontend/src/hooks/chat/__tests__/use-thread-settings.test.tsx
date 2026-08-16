import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoutingMode } from '@/enums';
import { useThreadSettings } from '@/hooks/chat/use-thread-settings';
import type { ChatThread } from '@/types';

const updateThread = vi.fn();
let judgeModelOptions = [{ value: 'OPENAI:gpt-4.1', label: 'GPT-4.1' }];

vi.mock('@/hooks/chat/use-update-thread', () => ({
  useUpdateThread: () => ({ updateThread, isPending: false }),
}));

vi.mock('@/hooks/chat/use-judge-model-options', () => ({
  useJudgeModelOptions: () => ({ options: judgeModelOptions, isLoading: false }),
}));

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string): string => key }),
}));

const thread: ChatThread = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Critic thread',
  routingMode: RoutingMode.AUTO,
  lastProvider: null,
  lastModel: null,
  preferredProvider: null,
  preferredModel: null,
  contextPackIds: [],
  isPinned: false,
  isArchived: false,
  systemPrompt: null,
  temperature: 0.7,
  maxTokens: 32000,
  judgeEnabled: true,
  judgeModel: 'OPENAI:gpt-4.1',
  criticEnabled: true,
  criticModel: 'OPENAI:gpt-4o-mini',
  qualityThreshold: 0.7,
  maxReRouteAttempts: 2,
  useMemory: true,
  useContext: true,
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
};

describe('useThreadSettings critic persistence', () => {
  beforeEach(() => {
    updateThread.mockReset();
    judgeModelOptions = [{ value: 'OPENAI:gpt-4.1', label: 'GPT-4.1' }];
  });

  it('loads and persists the exact critic settings from the thread', () => {
    const { result } = renderHook(() => useThreadSettings(thread));

    expect(result.current.criticEnabled).toBe(true);
    expect(result.current.criticModel).toBe('OPENAI:gpt-4o-mini');

    act(() => result.current.handleSave());

    expect(updateThread).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'thread-1',
        data: expect.objectContaining({
          criticEnabled: true,
          criticModel: 'OPENAI:gpt-4o-mini',
        }),
      }),
      expect.any(Object),
    );
  });

  it('clears critic enablement and model when judge mode is disabled', () => {
    const { result } = renderHook(() => useThreadSettings(thread));

    act(() => result.current.setJudgeEnabled(false));

    expect(result.current.judgeEnabled).toBe(false);
    expect(result.current.criticEnabled).toBe(false);
    expect(result.current.criticModel).toBeNull();
  });

  it('selects the first concrete model when critic review is enabled', () => {
    const criticOffThread = { ...thread, criticEnabled: false, criticModel: null };
    const { result } = renderHook(() => useThreadSettings(criticOffThread));

    act(() => result.current.setCriticEnabled(true));

    expect(result.current.criticEnabled).toBe(true);
    expect(result.current.criticModel).toBe('OPENAI:gpt-4.1');
  });

  it('does not enable critic review without a concrete model', () => {
    judgeModelOptions = [];
    const criticOffThread = { ...thread, criticEnabled: false, criticModel: null };
    const { result } = renderHook(() => useThreadSettings(criticOffThread));

    act(() => result.current.setCriticEnabled(true));

    expect(result.current.criticEnabled).toBe(false);
    expect(result.current.criticModel).toBeNull();
  });

  it('never persists critic enablement with a null model from legacy thread data', () => {
    judgeModelOptions = [];
    const legacyThread = { ...thread, criticEnabled: true, criticModel: null };
    const { result } = renderHook(() => useThreadSettings(legacyThread));

    act(() => result.current.handleSave());

    expect(updateThread).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ criticEnabled: false, criticModel: null }),
      }),
      expect.any(Object),
    );
  });

  it('calls the onSaved callback when the save mutation succeeds', () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useThreadSettings(thread, onSaved));

    act(() => result.current.handleSave());
    const [, options] = updateThread.mock.calls[0] as [unknown, { onSuccess: () => void }];
    act(() => options.onSuccess());

    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('does not throw when handleSave succeeds without an onSaved callback', () => {
    const { result } = renderHook(() => useThreadSettings(thread));

    act(() => result.current.handleSave());
    const [, options] = updateThread.mock.calls[0] as [unknown, { onSuccess: () => void }];

    expect(() => act(() => options.onSuccess())).not.toThrow();
  });
});
