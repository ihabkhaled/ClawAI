import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useJudgeModelOptions } from '@/hooks/chat/use-judge-model-options';

const cloudModels = { value: [] as Array<Record<string, unknown>> };

vi.mock('@/hooks/chat/use-available-connector-models', () => ({
  useAvailableConnectorModels: () => ({ models: cloudModels.value, isLoading: false }),
}));

vi.mock('@/hooks/chat/use-model-plan-access', () => ({
  useModelPlanAccess: () => ({
    isLocked: (_provider: string, model: string) => model === 'grok-4.7',
  }),
}));

vi.mock('@/hooks/ollama/use-local-models', () => ({
  useLocalModels: () => ({ models: [], isLoading: false }),
}));

describe('useJudgeModelOptions', () => {
  // This list kept its own localeCompare after the model picker and the public
  // pages moved to the shared comparator, so the judge dropdown offered
  // GPT 3.5 Turbo at the top while every other model list led with GPT 5.6.
  it('orders judges newest first, like every other model list', () => {
    cloudModels.value = [
      { provider: 'OPENAI', modelKey: 'gpt-3.5-turbo', displayName: 'GPT 3.5 Turbo' },
      { provider: 'OPENAI', modelKey: 'gpt-5.4', displayName: 'GPT 5.4' },
      { provider: 'OPENAI', modelKey: 'gpt-4o', displayName: 'GPT 4o' },
    ];

    const { result } = renderHook(() => useJudgeModelOptions());

    expect(result.current.options.map((o) => o.value)).toEqual([
      'OPENAI:gpt-5.4',
      'OPENAI:gpt-4o',
      'OPENAI:gpt-3.5-turbo',
    ]);
  });

  it('keeps the PROVIDER:model encoding the backend judge path expects', () => {
    cloudModels.value = [
      { provider: 'ANTHROPIC', modelKey: 'claude-opus-5', displayName: 'Claude Opus 5' },
    ];

    const { result } = renderHook(() => useJudgeModelOptions());

    expect(result.current.options[0]).toEqual({
      value: 'ANTHROPIC:claude-opus-5',
      label: 'ANTHROPIC · Claude Opus 5',
    });
  });
  it('flags only the judge a plan does not include', () => {
    cloudModels.value = [
      { provider: 'GROK', modelKey: 'grok-4.7', displayName: 'Grok 4.7' },
      { provider: 'OPENAI', modelKey: 'gpt-5.4', displayName: 'GPT 5.4' },
    ];

    const { result } = renderHook(() => useJudgeModelOptions());

    const byValue = new Map(result.current.options.map((option) => [option.value, option]));
    expect(byValue.get('GROK:grok-4.7')?.isLocked).toBe(true);
    expect(byValue.get('OPENAI:gpt-5.4')?.isLocked).toBeUndefined();
  });
});
