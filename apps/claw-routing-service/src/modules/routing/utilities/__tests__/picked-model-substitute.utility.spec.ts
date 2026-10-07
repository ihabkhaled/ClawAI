import { describe, expect, it } from 'vitest';
import { ModelCostClass } from '@claw/shared-types';

import { RouterProvider } from '../../../../generated/prisma';
import type { EligibleDeploymentRecord } from '../../types/model-deployment.types';
import { costClassRank, rankPickedModelSubstitutes } from '../picked-model-substitute.utility';

const dep = (provider: RouterProvider, model: string): EligibleDeploymentRecord => ({
  id: `${provider}-${model}`,
  provider,
  providerModelId: model,
});

const COSTS: Record<string, ModelCostClass> = {
  'ANTHROPIC/claude-opus-5': ModelCostClass.PREMIUM,
  'ANTHROPIC/claude-sonnet-5': ModelCostClass.STANDARD,
  'ANTHROPIC/claude-haiku-5': ModelCostClass.CHEAP,
  'ANTHROPIC/claude-fable-5': ModelCostClass.ULTRA,
  'OPENAI/gpt-5.6-sol': ModelCostClass.PREMIUM,
  'GROQ/llama-4': ModelCostClass.CHEAP,
  'GEMINI/gemini-3.6-flash': ModelCostClass.CHEAP,
  'GEMINI/gemini-pick': ModelCostClass.PREMIUM,
};
const costClassOf = (provider: string, model: string): ModelCostClass | undefined =>
  COSTS[`${provider.toUpperCase()}/${model}`];

describe('costClassRank', () => {
  it('orders cheap before premium and unknown last', () => {
    expect(costClassRank(ModelCostClass.FREE)).toBeLessThan(costClassRank(ModelCostClass.CHEAP));
    expect(costClassRank(ModelCostClass.CHEAP)).toBeLessThan(costClassRank(ModelCostClass.ULTRA));
    expect(costClassRank(undefined)).toBeGreaterThan(costClassRank(ModelCostClass.ULTRA));
  });
});

describe('rankPickedModelSubstitutes', () => {
  const pick = { provider: 'ANTHROPIC', model: 'claude-opus-5' };

  it('puts the same provider first, then other providers, then pricier models', () => {
    const result = rankPickedModelSubstitutes({
      pick,
      eligible: [
        dep(RouterProvider.GROQ, 'llama-4'),
        dep(RouterProvider.ANTHROPIC, 'claude-fable-5'),
        dep(RouterProvider.ANTHROPIC, 'claude-sonnet-5'),
        dep(RouterProvider.OPENAI, 'gpt-5.6-sol'),
      ],
      costClassOf,
      limit: 5,
    });
    expect(result.map((entry) => `${entry.provider}/${entry.model}`)).toEqual([
      'ANTHROPIC/claude-sonnet-5',
      'OPENAI/gpt-5.6-sol',
      'GROQ/llama-4',
      'ANTHROPIC/claude-fable-5',
    ]);
    expect(result[0]?.sameProvider).toBe(true);
    expect(result.at(-1)?.costlier).toBe(true);
    expect(result[0]?.costlier).toBe(false);
  });

  it('never returns the pick itself, nor a duplicate', () => {
    const result = rankPickedModelSubstitutes({
      pick,
      eligible: [
        dep(RouterProvider.ANTHROPIC, 'claude-opus-5'),
        dep(RouterProvider.GROQ, 'llama-4'),
        dep(RouterProvider.GROQ, 'llama-4'),
      ],
      costClassOf,
      limit: 5,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.model).toBe('llama-4');
  });

  it('marks a pricier model costlier and keeps an unpriced one unmarked', () => {
    const result = rankPickedModelSubstitutes({
      pick: { provider: 'GROQ', model: 'llama-4' },
      eligible: [
        dep(RouterProvider.OPENAI, 'gpt-5.6-sol'),
        dep(RouterProvider.GEMINI, 'unpriced-model'),
      ],
      costClassOf,
      limit: 5,
    });
    const byModel = Object.fromEntries(result.map((entry) => [entry.model, entry.costlier]));
    expect(byModel['gpt-5.6-sol']).toBe(true);
    expect(byModel['unpriced-model']).toBe(false);
  });

  it('marks every cloud substitute costlier when the pick is unpriced (a local model)', () => {
    const result = rankPickedModelSubstitutes({
      pick: { provider: 'OLLAMA', model: 'llama3' },
      eligible: [
        dep(RouterProvider.GROQ, 'llama-4'),
        dep(RouterProvider.OPENAI, 'gpt-5.6-sol'),
        dep(RouterProvider.GEMINI, 'unpriced-model'),
      ],
      costClassOf,
      limit: 5,
    });
    expect(result).toHaveLength(3);
    expect(result.every((entry) => entry.costlier)).toBe(true);
    expect(result[0]?.model).toBe('llama-4');
  });

  it('reaches other providers even when one provider has many models', () => {
    const geminiModels = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) =>
      dep(RouterProvider.GEMINI, `gemini-${id}`),
    );
    const result = rankPickedModelSubstitutes({
      pick: { provider: 'GEMINI', model: 'gemini-pick' },
      eligible: [
        ...geminiModels,
        dep(RouterProvider.GROQ, 'llama-4'),
        dep(RouterProvider.OPENAI, 'gpt-5.6-sol'),
      ],
      costClassOf,
      limit: 5,
    });
    const providers = result.map((entry) => entry.provider);
    expect(providers.filter((p) => p === RouterProvider.GEMINI)).toHaveLength(3);
    expect(providers).toContain(RouterProvider.GROQ);
    expect(providers).toContain(RouterProvider.OPENAI);
    // Same provider still comes first.
    expect(providers[0]).toBe(RouterProvider.GEMINI);
  });

  it('never offers a speech, video, image or embedding model as a substitute', () => {
    const result = rankPickedModelSubstitutes({
      pick,
      eligible: [
        dep(RouterProvider.GEMINI, 'models/gemini-2.5-flash-preview-tts'),
        dep(RouterProvider.GEMINI, 'models/veo-3.1-fast-generate-preview'),
        dep(RouterProvider.GEMINI, 'models/gemini-embedding-001'),
        dep(RouterProvider.GEMINI, 'models/gemini-2.5-flash-image'),
        dep(RouterProvider.OPENAI, 'gpt-4o-mini-tts-2025-03-20'),
        dep(RouterProvider.OPENAI, 'gpt-4o-realtime-preview'),
        dep(RouterProvider.GEMINI, 'models/gemini-2.5-flash'),
        dep(RouterProvider.OPENAI, 'gpt-5.6-sol'),
      ],
      costClassOf,
      limit: 5,
    });
    expect(result.map((entry) => entry.model).sort()).toEqual([
      'gpt-5.6-sol',
      'models/gemini-2.5-flash',
    ]);
  });

  it('honours the limit and returns nothing for an empty pool', () => {
    const eligible = [
      dep(RouterProvider.GROQ, 'llama-4'),
      dep(RouterProvider.GEMINI, 'gemini-3.6-flash'),
      dep(RouterProvider.ANTHROPIC, 'claude-haiku-5'),
    ];
    expect(rankPickedModelSubstitutes({ pick, eligible, costClassOf, limit: 2 })).toHaveLength(2);
    expect(rankPickedModelSubstitutes({ pick, eligible: [], costClassOf, limit: 2 })).toEqual([]);
    expect(rankPickedModelSubstitutes({ pick, eligible, costClassOf, limit: 0 })).toEqual([]);
  });

  describe('included safety net', () => {
    it('ends the list with a model that needs no credit when the ranking had none', () => {
      const result = rankPickedModelSubstitutes({
        pick,
        eligible: [
          dep(RouterProvider.ANTHROPIC, 'claude-sonnet-5'),
          dep(RouterProvider.GEMINI, 'gemini-3.6-flash'),
          dep(RouterProvider.OPENAI, 'gpt-5.6-sol'),
          dep(RouterProvider.OLLAMA, 'gpt-oss:120b'),
        ],
        costClassOf,
        limit: 3,
      });

      expect(result).toHaveLength(3);
      expect(result.at(-1)?.provider).toBe('OLLAMA');
    });

    it('leaves the list alone when an included model is already in it', () => {
      const result = rankPickedModelSubstitutes({
        pick,
        eligible: [
          dep(RouterProvider.OLLAMA, 'gpt-oss:120b'),
          dep(RouterProvider.GEMINI, 'gemini-3.6-flash'),
        ],
        costClassOf,
        limit: 5,
      });

      expect(result.filter((entry) => entry.provider === 'OLLAMA')).toHaveLength(1);
    });

    it('adds nothing when no included model is eligible', () => {
      const result = rankPickedModelSubstitutes({
        pick,
        eligible: [dep(RouterProvider.GEMINI, 'gemini-3.6-flash')],
        costClassOf,
        limit: 5,
      });

      expect(result.map((entry) => entry.provider)).toEqual(['GEMINI']);
    });
  });
});
