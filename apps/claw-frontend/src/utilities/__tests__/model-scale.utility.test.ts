import { describe, expect, it } from 'vitest';

import type { ModelSizeEntry } from '@/types/model-scale.types';
import {
  buildModelScaleText,
  buildModelSizeLookup,
  formatParameterCount,
  formatParameterCountDetail,
  formatTokenCount,
  modelSizeKey,
  parseParameterCountText,
  resolveModelScale,
} from '@/utilities/model-scale.utility';

const t = (key: string, params?: Record<string, string | number>): string => {
  const templates: Record<string, string> = {
    'modelScale.context': '{value} context',
    'modelScale.parameters': '{value} params',
    'modelScale.activeNote': '{value} active per token',
  };
  return (templates[key] ?? key).replace('{value}', String(params?.['value'] ?? ''));
};

const entry = (overrides: Partial<ModelSizeEntry> = {}): ModelSizeEntry => ({
  provider: 'OPENROUTER',
  modelKey: 'moonshotai/kimi-k2',
  contextWindowTokens: 262_144,
  parameterCountBillions: 1000,
  activeParameterCountBillions: 32,
  ...overrides,
});

describe('formatTokenCount', () => {
  it.each([
    [2048, '2K'],
    [4096, '4K'],
    [8192, '8K'],
    [32_768, '32K'],
    [128_000, '128K'],
    [131_072, '128K'],
    [200_000, '200K'],
    [262_144, '256K'],
    [1_000_000, '1M'],
    [1_048_576, '1M'],
    [1_500_000, '1.5M'],
    [2_000_000, '2M'],
    [2_097_152, '2M'],
    [10_000_000, '10M'],
    [512, '512'],
    [1, '1'],
    [999_999, '1M'],
    [123_456, '123.5K'],
  ])('writes %s tokens as %s', (tokens, expected) => {
    expect(formatTokenCount(tokens, 'en')).toBe(expected);
  });

  it.each([null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'is null for an unknown count (%s)',
    (tokens) => {
      expect(formatTokenCount(tokens, 'en')).toBeNull();
    },
  );

  it('uses the locale decimal separator but always Latin digits and Latin suffixes', () => {
    expect(formatTokenCount(1_500_000, 'de')).toBe('1,5M');
    expect(formatTokenCount(1_500_000, 'ar')).toBe('1.5M');
    expect(formatTokenCount(128_000, 'fa')).toBe('128K');
    expect(formatTokenCount(128_000, 'hi')).toBe('128K');
    expect(formatTokenCount(1_500_000, 'th')).toBe('1.5M');
  });

  it('survives a locale tag Intl does not know', () => {
    expect(formatTokenCount(128_000, 'not a locale')).toBe('128K');
  });
});

describe('formatParameterCount', () => {
  it.each([
    [0.5, '0.5B'],
    [0.135, '0.135B'],
    [1.5, '1.5B'],
    [7.6, '7.6B'],
    [8, '8B'],
    [27, '27B'],
    [46.7, '46.7B'],
    [70, '70B'],
    [117, '117B'],
    [405, '405B'],
    [671, '671B'],
    [750, '750B'],
    [1000, '1T'],
    [1600, '1.6T'],
    [2400, '2.4T'],
    [999.6, '1T'],
  ])('writes %s billion as %s', (billions, expected) => {
    expect(formatParameterCount(billions, 'en')).toBe(expected);
  });

  it.each([null, undefined, 0, -1, Number.NaN])('is null for an unknown count (%s)', (billions) => {
    expect(formatParameterCount(billions, 'en')).toBeNull();
  });

  it('follows the locale separator', () => {
    expect(formatParameterCount(7.6, 'de')).toBe('7,6B');
    expect(formatParameterCount(7.6, 'fr')).toBe('7,6B');
  });
});

describe('parseParameterCountText', () => {
  it.each([
    ['7.6B', 7.6, null],
    ['8B', 8, null],
    ['0.5B', 0.5, null],
    ['1T', 1000, null],
    ['134.52M', 0.135, null],
    ['671B (37B active)', 671, 37],
    ['1T (32B active)', 1000, 32],
    [' 70b ', 70, null],
  ])('reads %s', (text, total, active) => {
    expect(parseParameterCountText(text)).toEqual({ totalBillions: total, activeBillions: active });
  });

  it.each([null, undefined, '', 'unknown', '8B-Q4', '0B', 'B', '7 billion'])(
    'does not guess from %s',
    (text) => {
      expect(parseParameterCountText(text)).toBeNull();
    },
  );
});

describe('resolveModelScale', () => {
  it('uses the connector window and the registry parameter count', () => {
    expect(
      resolveModelScale({
        contextTokens: 1_048_576,
        entry: entry({ contextWindowTokens: 8_192, parameterCountBillions: 750 }),
      }),
    ).toEqual({ contextTokens: 1_048_576, parameterBillions: 750, activeParameterBillions: 32 });
  });

  it('falls back to the registry window when the row carries none', () => {
    expect(resolveModelScale({ contextTokens: null, entry: entry() }).contextTokens).toBe(262_144);
  });

  it("trusts the local runtime's own size over the registry", () => {
    expect(
      resolveModelScale({
        runtimeParameterText: '8.2B',
        entry: entry({ parameterCountBillions: 7 }),
      }),
    ).toMatchObject({ parameterBillions: 8.2, activeParameterBillions: null });
  });

  it('knows nothing about a closed model', () => {
    expect(
      resolveModelScale({
        entry: entry({
          contextWindowTokens: null,
          parameterCountBillions: null,
          activeParameterCountBillions: null,
        }),
      }),
    ).toEqual({ contextTokens: null, parameterBillions: null, activeParameterBillions: null });
  });

  it('never keeps an active share without a total', () => {
    expect(
      resolveModelScale({ activeParameterBillions: 5, parameterBillions: null }),
    ).toMatchObject({ parameterBillions: null, activeParameterBillions: null });
  });
});

describe('buildModelScaleText', () => {
  it('writes both parts', () => {
    expect(
      buildModelScaleText(
        { contextTokens: 1_048_576, parameterBillions: 750, activeParameterBillions: null },
        t,
        'en',
      ),
    ).toEqual({ label: '1M context · 750B params', title: '1M context · 750B params' });
  });

  it('adds the active share to the tooltip only', () => {
    expect(
      buildModelScaleText(
        { contextTokens: 262_144, parameterBillions: 1000, activeParameterBillions: 32 },
        t,
        'en',
      ),
    ).toEqual({
      label: '256K context · 1T params',
      title: '256K context · 1T params, 32B active per token',
    });
  });

  it('leaves out the part that is unknown', () => {
    expect(
      buildModelScaleText(
        { contextTokens: 400_000, parameterBillions: null, activeParameterBillions: null },
        t,
        'en',
      )?.label,
    ).toBe('400K context');
    expect(
      buildModelScaleText(
        { contextTokens: null, parameterBillions: 8, activeParameterBillions: null },
        t,
        'en',
      )?.label,
    ).toBe('8B params');
  });

  it('is undefined when nothing is known', () => {
    expect(
      buildModelScaleText(
        { contextTokens: null, parameterBillions: null, activeParameterBillions: null },
        t,
        'en',
      ),
    ).toBeUndefined();
    expect(
      buildModelScaleText(
        { contextTokens: 0, parameterBillions: 0, activeParameterBillions: null },
        t,
        'en',
      ),
    ).toBeUndefined();
  });
});

describe('formatParameterCountDetail', () => {
  it('writes a dense and a mixture-of-experts model', () => {
    expect(formatParameterCountDetail(70, null, t, 'en')).toBe('70B');
    expect(formatParameterCountDetail(671, 37, t, 'en')).toBe('671B (37B active per token)');
    expect(formatParameterCountDetail(null, 37, t, 'en')).toBeNull();
  });
});

describe('buildModelSizeLookup', () => {
  const lookup = buildModelSizeLookup([
    entry(),
    entry({ provider: 'OLLAMA', modelKey: 'qwen3:8b', parameterCountBillions: 8.2 }),
  ]);

  it('finds a cloud model by provider and key', () => {
    expect(lookup('OPENROUTER', 'moonshotai/kimi-k2')?.parameterCountBillions).toBe(1000);
  });

  it('maps the picker local groups and the Smart Router cloud name onto the registry provider', () => {
    expect(lookup('local-ollama', 'qwen3:8b')?.parameterCountBillions).toBe(8.2);
    expect(lookup('OLLAMA_CLOUD', 'qwen3:8b')?.parameterCountBillions).toBe(8.2);
    expect(modelSizeKey('local-llamacpp', 'x')).toBe('LLAMACPP::x');
  });

  it('tries each candidate key in order', () => {
    expect(lookup('local-ollama', 'qwen3', 'qwen3:8b')?.modelKey).toBe('qwen3:8b');
  });

  it('borrows the parameter count of the same model key from another provider, never its window', () => {
    const hosted = buildModelSizeLookup([
      entry({
        provider: 'OPENROUTER',
        modelKey: 'openai/gpt-oss-120b',
        contextWindowTokens: 131_072,
        parameterCountBillions: 117,
        activeParameterCountBillions: 5.1,
      }),
    ]);

    expect(hosted('HUGGING_FACE', 'openai/gpt-oss-120b')).toMatchObject({
      provider: 'HUGGING_FACE',
      contextWindowTokens: null,
      parameterCountBillions: 117,
      activeParameterCountBillions: 5.1,
    });
    expect(hosted('HUGGING_FACE', 'OpenAI/GPT-OSS-120B')?.parameterCountBillions).toBe(117);
    expect(hosted('HUGGING_FACE', 'gpt-oss-120b')).toBeUndefined();
  });

  it('does not borrow from a row that has no parameter count', () => {
    const closed = buildModelSizeLookup([
      entry({ provider: 'OPENAI', modelKey: 'gpt-5.4', parameterCountBillions: null }),
    ]);

    expect(closed('AZURE', 'gpt-5.4')).toBeUndefined();
  });

  it('is undefined for a model the registry does not know', () => {
    expect(lookup('OPENAI', 'gpt-5.4')).toBeUndefined();
  });
});
