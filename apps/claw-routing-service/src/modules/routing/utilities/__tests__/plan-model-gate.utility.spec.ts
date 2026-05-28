import { applyPlanModelGate } from '../plan-model-gate.utility';
import { type RoutingDecisionResult } from '../../types/routing.types';

const decision = (
  provider: string,
  model: string,
  chain: Array<{ provider: string; model: string }>,
): RoutingDecisionResult =>
  ({
    selectedProvider: provider,
    selectedModel: model,
    fallbackChain: chain,
    routingMode: 'AUTO',
    confidence: 0.9,
    reasonTags: [],
    privacyClass: 'PUBLIC',
    costClass: 'STANDARD',
  }) as unknown as RoutingDecisionResult;

describe('applyPlanModelGate', () => {
  it('passes through unchanged when allowedModels is empty (allow-all)', () => {
    const d = decision('OPENAI', 'gpt-4o', [{ provider: 'ANTHROPIC', model: 'claude' }]);
    const res = applyPlanModelGate(d, []);
    expect(res.outcome).toBe('unrestricted');
    expect(res.decision.selectedProvider).toBe('OPENAI');
    expect(res.decision.fallbackChain).toHaveLength(1);
  });

  it('keeps an allowed primary and filters the fallback chain to allowed-only', () => {
    const d = decision('OPENAI', 'gpt-4o', [
      { provider: 'ANTHROPIC', model: 'claude-opus' },
      { provider: 'OPENAI', model: 'gpt-4o-mini' },
    ]);
    const res = applyPlanModelGate(d, ['OPENAI/gpt-4o', 'OPENAI/gpt-4o-mini']);
    expect(res.outcome).toBe('allowed');
    expect(res.decision.selectedModel).toBe('gpt-4o');
    expect(res.decision.fallbackChain).toEqual([{ provider: 'OPENAI', model: 'gpt-4o-mini' }]);
  });

  it('promotes the first allowed fallback when the primary is forbidden', () => {
    const d = decision('ANTHROPIC', 'claude-opus', [
      { provider: 'OPENAI', model: 'gpt-4o-mini' },
      { provider: 'GEMINI', model: 'gemini' },
    ]);
    const res = applyPlanModelGate(d, ['OPENAI/gpt-4o-mini']);
    expect(res.outcome).toBe('promoted');
    expect(res.decision.selectedProvider).toBe('OPENAI');
    expect(res.decision.selectedModel).toBe('gpt-4o-mini');
    expect(res.decision.fallbackChain).toHaveLength(0);
  });

  it('returns unsatisfiable + leaves the decision when the plan allows none', () => {
    const d = decision('ANTHROPIC', 'claude-opus', [{ provider: 'GEMINI', model: 'gemini' }]);
    const res = applyPlanModelGate(d, ['OPENAI/gpt-4o']);
    expect(res.outcome).toBe('unsatisfiable');
    expect(res.decision.selectedProvider).toBe('ANTHROPIC');
  });
});
