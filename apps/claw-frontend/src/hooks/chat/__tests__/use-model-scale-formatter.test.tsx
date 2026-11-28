import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useModelScaleFormatter } from '@/hooks/chat/use-model-scale-formatter';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'de',
    t: (key: string, params?: Record<string, string>) => `${key}=${params?.['value'] ?? ''}`,
  }),
}));

vi.mock('@/hooks/chat/use-model-sizes', () => ({
  useModelSizes: () => ({
    isLoading: false,
    lookup: (provider: string, key: string) =>
      provider === 'OPENROUTER' && key === 'meta-llama/llama-3.3-70b-instruct'
        ? {
            contextWindowTokens: 131_072,
            parameterCountBillions: 70,
            activeParameterCountBillions: null,
          }
        : undefined,
  }),
}));

describe('useModelScaleFormatter', () => {
  it('builds the size text and the bare parameter label for a model the registry knows', () => {
    const { result } = renderHook(() => useModelScaleFormatter());
    const key = 'meta-llama/llama-3.3-70b-instruct';

    expect(result.current.scaleText('OPENROUTER', key, null)?.label).toBe(
      'modelScale.context=128K · modelScale.parameters=70B',
    );
    expect(result.current.parameterLabel('OPENROUTER', key)).toBe('70B');
    expect(result.current.parametersHeading).toBe('modelScale.parametersLabel=');
  });

  it('prefers the window the caller already holds and tolerates an unknown model', () => {
    const { result } = renderHook(() => useModelScaleFormatter());

    expect(result.current.scaleText('OPENAI', 'gpt-5.4', 400_000)?.label).toBe(
      'modelScale.context=400K',
    );
    expect(result.current.scaleText('OPENAI', 'gpt-5.4')).toBeUndefined();
    expect(result.current.parameterLabel('OPENAI', 'gpt-5.4')).toBeNull();
  });

  it('formats numbers in the active locale', () => {
    const { result } = renderHook(() => useModelScaleFormatter());

    expect(result.current.scaleText('OPENAI', 'x', 1_500_000)?.label).toBe(
      'modelScale.context=1,5M',
    );
  });
});
