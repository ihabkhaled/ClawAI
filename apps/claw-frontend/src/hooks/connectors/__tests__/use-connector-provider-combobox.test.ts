import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorProvider } from '@/enums';
import { useConnectorProviderCombobox } from '@/hooks/connectors/use-connector-provider-combobox';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('useConnectorProviderCombobox', () => {
  it('returns exactly 4 groups: connected, low-cost, aggregators, direct labs', () => {
    const { result } = renderHook(() => useConnectorProviderCombobox());
    expect(result.current.groups).toHaveLength(4);
    expect(result.current.groups.map((g) => g.key)).toEqual([
      'connected',
      'LOW_COST_FAST_INFERENCE',
      'AGGREGATOR',
      'DIRECT_MODEL_LAB',
    ]);
  });

  it('puts every bespoke-adapter provider in the connected group', () => {
    const { result } = renderHook(() => useConnectorProviderCombobox());
    const connected = result.current.groups[0];
    const values = connected?.options.map((o) => o.value) ?? [];
    expect(values).toEqual(
      expect.arrayContaining([
        ConnectorProvider.OPENAI,
        ConnectorProvider.ANTHROPIC,
        ConnectorProvider.GEMINI,
        ConnectorProvider.AWS_BEDROCK,
        ConnectorProvider.DEEPSEEK,
        ConnectorProvider.OLLAMA,
        ConnectorProvider.GROK,
        ConnectorProvider.LLAMACPP,
      ]),
    );
    expect(values).not.toContain(ConnectorProvider.OPENROUTER);
  });

  it('every preset provider appears in exactly one of the 3 preset groups', () => {
    const { result } = renderHook(() => useConnectorProviderCombobox());
    const presetGroups = result.current.groups.slice(1);
    const allValues = presetGroups.flatMap((g) => g.options.map((o) => o.value));
    const uniqueValues = new Set(allValues);
    expect(uniqueValues.size).toBe(allValues.length);
    expect(allValues).toEqual(
      expect.arrayContaining([
        ConnectorProvider.OPENROUTER,
        ConnectorProvider.GROQ,
        ConnectorProvider.CEREBRAS,
        ConnectorProvider.SAMBANOVA,
        ConnectorProvider.DEEPINFRA,
        ConnectorProvider.FIREWORKS,
        ConnectorProvider.TOGETHER,
        ConnectorProvider.MISTRAL,
        ConnectorProvider.MOONSHOT,
        ConnectorProvider.ZAI,
        ConnectorProvider.QWEN,
        ConnectorProvider.CLOUDFLARE,
        ConnectorProvider.VERCEL_AI_GATEWAY,
        ConnectorProvider.PERPLEXITY,
        ConnectorProvider.COHERE,
      ]),
    );
  });

  it('flags free-tier presets with hasFreeTier', () => {
    const { result } = renderHook(() => useConnectorProviderCombobox());
    const allOptions = result.current.groups.flatMap((g) => g.options);
    const groq = allOptions.find((o) => o.value === ConnectorProvider.GROQ);
    const cerebras = allOptions.find((o) => o.value === ConnectorProvider.CEREBRAS);
    expect(groq?.hasFreeTier).toBe(true);
    expect(cerebras?.hasFreeTier).toBe(false);
  });

  it('defaults to closed and toggles via setOpen', () => {
    const { result } = renderHook(() => useConnectorProviderCombobox());
    expect(result.current.open).toBe(false);
    result.current.setOpen(true);
  });
});
