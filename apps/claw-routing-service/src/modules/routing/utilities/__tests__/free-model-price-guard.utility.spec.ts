import type { RoutingDecisionResult } from '../../types/routing.types';
import { applyFreeModelPriceGuard, isOutputPriceAboveCap } from '../free-model-price-guard.utility';

const decision = (
  selected: [string, string],
  chain: Array<[string, string]>,
): RoutingDecisionResult =>
  ({
    selectedProvider: selected[0],
    selectedModel: selected[1],
    fallbackChain: chain.map(([provider, model]) => ({ provider, model })),
  }) as unknown as RoutingDecisionResult;

const DEAR = new Set(['ANTHROPIC/opus', 'OPENAI/gpt-top']);
const isAbove = (provider: string, model: string): boolean => DEAR.has(`${provider}/${model}`);

describe('isOutputPriceAboveCap', () => {
  it('is false with no limit, or with no known price', () => {
    expect(isOutputPriceAboveCap(25_000_000, null)).toBe(false);
    expect(isOutputPriceAboveCap(25_000_000, undefined)).toBe(false);
    expect(isOutputPriceAboveCap(null, 5_000_000)).toBe(false);
    expect(isOutputPriceAboveCap(undefined, 5_000_000)).toBe(false);
  });

  it('is true only for a price strictly above the limit', () => {
    expect(isOutputPriceAboveCap(5_000_001, 5_000_000)).toBe(true);
    expect(isOutputPriceAboveCap(5_000_000, 5_000_000)).toBe(false);
    expect(isOutputPriceAboveCap(0, 5_000_000)).toBe(false);
  });

  it('treats a limit of zero as "only free models"', () => {
    expect(isOutputPriceAboveCap(1, 0)).toBe(true);
    expect(isOutputPriceAboveCap(0, 0)).toBe(false);
  });
});

describe('applyFreeModelPriceGuard', () => {
  it('leaves a decision alone when nothing in it is dear', () => {
    const original = decision(['GEMINI', 'flash'], [['OLLAMA', 'glm']]);
    const result = applyFreeModelPriceGuard(original, isAbove);

    expect(result.decision).toBe(original);
    expect(result.excludedCandidates).toBe(0);
    expect(result.promoted).toBe(false);
  });

  it('drops dear fallbacks and keeps the pick', () => {
    const result = applyFreeModelPriceGuard(
      decision(
        ['GEMINI', 'flash'],
        [
          ['ANTHROPIC', 'opus'],
          ['OLLAMA', 'glm'],
        ],
      ),
      isAbove,
    );

    expect(result.decision.selectedModel).toBe('flash');
    expect(result.decision.fallbackChain).toEqual([{ provider: 'OLLAMA', model: 'glm' }]);
    expect(result.excludedCandidates).toBe(1);
    expect(result.promoted).toBe(false);
  });

  it('replaces a dear pick with the first cheaper fallback', () => {
    const result = applyFreeModelPriceGuard(
      decision(
        ['ANTHROPIC', 'opus'],
        [
          ['OPENAI', 'gpt-top'],
          ['GEMINI', 'flash'],
          ['OLLAMA', 'glm'],
        ],
      ),
      isAbove,
    );

    expect(result.decision.selectedProvider).toBe('GEMINI');
    expect(result.decision.selectedModel).toBe('flash');
    expect(result.decision.fallbackChain).toEqual([{ provider: 'OLLAMA', model: 'glm' }]);
    expect(result.excludedCandidates).toBe(2);
    expect(result.promoted).toBe(true);
  });

  it('returns the decision unchanged when nothing cheaper exists, so the user still gets an answer', () => {
    const original = decision(['ANTHROPIC', 'opus'], [['OPENAI', 'gpt-top']]);
    const result = applyFreeModelPriceGuard(original, isAbove);

    expect(result.decision).toBe(original);
    expect(result.promoted).toBe(false);
    expect(result.excludedCandidates).toBe(2);
  });

  it('copes with a decision that has no fallback chain', () => {
    const bare = { selectedProvider: 'GEMINI', selectedModel: 'flash' } as RoutingDecisionResult;
    expect(applyFreeModelPriceGuard(bare, isAbove).decision).toBe(bare);
  });
});
