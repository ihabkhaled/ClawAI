import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  BusinessException,
  ProviderCreditExhaustedException,
  ProviderModelUnavailableException,
  ProviderRateLimitedException,
} from '../../../../common/errors';
import type { MessageRoutedData } from '../../types/execution.types';
import type { PickedModelSubstitute } from '../../types/picked-model-fallback.types';
import {
  describePickedModelFailure,
  isPickedModelTurn,
  isProviderWideFailure,
  isSubstitutableFailure,
  pickedCandidateSkipReason,
  parsePickedModelSubstitutes,
  pickedModelCandidateChain,
  pickedModelFallbackPart,
  suggestedModelsAfterFailure,
} from '../picked-model-fallback.utility';

const sub = (provider: string, model: string, costlier = false): PickedModelSubstitute => ({
  provider,
  model,
  sameProvider: provider === 'ANTHROPIC',
  costlier,
});

function payload(overrides: Partial<MessageRoutedData> = {}): MessageRoutedData {
  return {
    messageId: 'm1',
    threadId: 't1',
    selectedProvider: 'ANTHROPIC',
    selectedModel: 'claude-opus-5',
    routingMode: 'MANUAL_MODEL',
    timestamp: '2026-10-02T00:00:00.000Z',
    ...overrides,
  };
}

const SUBS = [
  sub('ANTHROPIC', 'claude-sonnet-5'),
  sub('OPENAI', 'gpt-5.6-sol', true),
  sub('GROQ', 'llama-4'),
  sub('GEMINI', 'gemini-3.6-flash'),
  sub('OLLAMA', 'glm-5.2'),
];

describe('pickedModelCandidateChain', () => {
  it('is only the pick when routing named no substitutes (the old behaviour)', () => {
    expect(pickedModelCandidateChain(payload())).toEqual([
      { provider: 'ANTHROPIC', model: 'claude-opus-5' },
    ]);
  });

  it('lists the pick, then every named substitute in routing order (the loop caps attempts at two)', () => {
    const chain = pickedModelCandidateChain(payload({ pickedModelSubstitutes: SUBS }));
    expect(chain.map((c) => `${c.provider}/${c.model}`)).toEqual([
      'ANTHROPIC/claude-opus-5',
      'ANTHROPIC/claude-sonnet-5',
      'OPENAI/gpt-5.6-sol',
      'GROQ/llama-4',
      'GEMINI/gemini-3.6-flash',
      'OLLAMA/glm-5.2',
    ]);
  });

  it('drops a substitute equal to the pick', () => {
    const chain = pickedModelCandidateChain(
      payload({
        pickedModelSubstitutes: [sub('ANTHROPIC', 'claude-opus-5'), sub('GROQ', 'llama-4')],
      }),
    );
    expect(chain.map((c) => c.model)).toEqual(['claude-opus-5', 'llama-4']);
  });
});

describe('isPickedModelTurn', () => {
  it('is true only for MANUAL_MODEL', () => {
    expect(isPickedModelTurn(payload())).toBe(true);
    expect(isPickedModelTurn(payload({ routingMode: 'AUTO' }))).toBe(false);
  });
});

describe('isSubstitutableFailure', () => {
  it('does not substitute after a credit (402), plan (403) or quota (429) refusal', () => {
    for (const status of [
      HttpStatus.PAYMENT_REQUIRED,
      HttpStatus.FORBIDDEN,
      HttpStatus.TOO_MANY_REQUESTS,
    ]) {
      expect(isSubstitutableFailure(new BusinessException('refused', 'REFUSED', status))).toBe(
        false,
      );
    }
  });

  it('does not substitute after a user stop', () => {
    expect(
      isSubstitutableFailure(
        new BusinessException('stopped', 'STREAM_CANCELLED', HttpStatus.BAD_GATEWAY),
      ),
    ).toBe(false);
  });

  it('substitutes after a provider failure of any other kind', () => {
    expect(
      isSubstitutableFailure(new BusinessException('down', 'LLM_FAILED', HttpStatus.BAD_GATEWAY)),
    ).toBe(true);
    expect(
      isSubstitutableFailure(new BusinessException('bad', 'LLM_FAILED', HttpStatus.BAD_REQUEST)),
    ).toBe(true);
    expect(isSubstitutableFailure(new Error('socket hang up'))).toBe(true);
  });

  it('substitutes after a retired model (404) and does not call it a provider outage', () => {
    const error = new ProviderModelUnavailableException();
    expect(isSubstitutableFailure(error)).toBe(true);
    expect(isProviderWideFailure(error)).toBe(false);
  });
});

describe('suggestedModelsAfterFailure', () => {
  it('offers up to three models, never one already tried or the pick', () => {
    const result = suggestedModelsAfterFailure(payload({ pickedModelSubstitutes: SUBS }), [
      { provider: 'ANTHROPIC', model: 'claude-opus-5' },
      { provider: 'ANTHROPIC', model: 'claude-sonnet-5' },
      { provider: 'OPENAI', model: 'gpt-5.6-sol' },
    ]);
    expect(result).toEqual([
      { provider: 'GROQ', model: 'llama-4' },
      { provider: 'GEMINI', model: 'gemini-3.6-flash' },
      { provider: 'OLLAMA', model: 'glm-5.2' },
    ]);
  });

  it('puts costlier models last and caps at three', () => {
    const result = suggestedModelsAfterFailure(payload({ pickedModelSubstitutes: SUBS }), []);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.model)).not.toContain('gpt-5.6-sol');
  });

  it('is empty when routing named nothing', () => {
    expect(suggestedModelsAfterFailure(payload(), [])).toEqual([]);
  });
});

describe('parsePickedModelSubstitutes', () => {
  it('drops malformed entries and treats a missing costlier flag as costlier', () => {
    const parsed = parsePickedModelSubstitutes([
      { provider: 'GROQ', model: 'llama-4', sameProvider: false, costlier: false },
      { provider: 'GROQ' },
      null,
      { provider: 'OPENAI', model: 'gpt-5.6-sol' },
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed?.[1]?.costlier).toBe(true);
  });

  it('is undefined when nothing usable arrives', () => {
    expect(parsePickedModelSubstitutes(undefined)).toBeUndefined();
    expect(parsePickedModelSubstitutes([{}])).toBeUndefined();
  });
});

describe('pickedModelFallbackPart', () => {
  const p = payload({ pickedModelSubstitutes: SUBS });

  it('is empty for the pick itself and for AUTO', () => {
    expect(
      pickedModelFallbackPart(p, { provider: 'ANTHROPIC', model: 'claude-opus-5' }, 0),
    ).toEqual({});
    expect(
      pickedModelFallbackPart(
        payload({ routingMode: 'AUTO' }),
        { provider: 'GROQ', model: 'x' },
        1,
      ),
    ).toEqual({});
  });

  it('names the failed pick and the costlier flag when a substitute answered', () => {
    expect(pickedModelFallbackPart(p, { provider: 'OPENAI', model: 'gpt-5.6-sol' }, 2)).toEqual({
      pickedModelFallback: {
        originalProvider: 'ANTHROPIC',
        originalModel: 'claude-opus-5',
        costlier: true,
      },
    });
    expect(
      pickedModelFallbackPart(p, { provider: 'ANTHROPIC', model: 'claude-sonnet-5' }, 1)
        .pickedModelFallback?.costlier,
    ).toBe(false);
  });
});

describe('describePickedModelFailure', () => {
  it('keeps the chain sentence when no substitute was tried', () => {
    expect(describePickedModelFailure(payload(), [{}], 'base')).toBe('base');
  });

  it('names the pick and the number of substitutes, without provider text', () => {
    expect(describePickedModelFailure(payload(), [{}, {}, {}], 'base')).toBe(
      'ANTHROPIC/claude-opus-5 failed, and 2 substitute models could not answer either.',
    );
  });
});

describe('isProviderWideFailure / pickedCandidateSkipReason', () => {
  it('is provider-wide for 5xx, upstream rate limits and transport errors, not for a 404', () => {
    expect(
      isProviderWideFailure(new BusinessException('x', 'X', HttpStatus.SERVICE_UNAVAILABLE)),
    ).toBe(true);
    expect(isProviderWideFailure(new Error('fetch failed'))).toBe(true);
    // The upstream status wins over the (always 400) status of the wrapper.
    expect(
      isProviderWideFailure(
        Object.assign(new BusinessException('x', 'X'), { upstreamStatus: 503 }),
      ),
    ).toBe(true);
    expect(
      isProviderWideFailure(
        Object.assign(new BusinessException('x', 'X'), { upstreamStatus: 404 }),
      ),
    ).toBe(false);
    expect(isProviderWideFailure(new ProviderRateLimitedException('GROQ'))).toBe(true);
    expect(isProviderWideFailure(new BusinessException('x', 'X', HttpStatus.NOT_FOUND))).toBe(
      false,
    );
    expect(isProviderWideFailure(new BusinessException('x', 'X', HttpStatus.BAD_REQUEST))).toBe(
      false,
    );
  });

  it('treats an upstream provider rate limit as substitutable', () => {
    expect(isSubstitutableFailure(new ProviderRateLimitedException('GROQ'))).toBe(true);
    expect(ProviderCreditExhaustedException).toBeDefined();
  });

  it('skips on the cap of two attempts or on a failed provider', () => {
    const failed = new Set(['ANTHROPIC']);
    expect(pickedCandidateSkipReason({ provider: 'GROQ' }, failed, 2)).toBe('cap');
    expect(pickedCandidateSkipReason({ provider: 'anthropic' }, failed, 0)).toBe('provider');
    expect(pickedCandidateSkipReason({ provider: 'GROQ' }, failed, 1)).toBeNull();
  });

  it('does not suggest a provider that failed as a whole', () => {
    const result = suggestedModelsAfterFailure(
      payload({ pickedModelSubstitutes: [sub('GROQ', 'llama-4'), sub('GEMINI', 'flash')] }),
      [],
      new Set(['GROQ']),
    );
    expect(result).toEqual([{ provider: 'GEMINI', model: 'flash' }]);
  });
});
