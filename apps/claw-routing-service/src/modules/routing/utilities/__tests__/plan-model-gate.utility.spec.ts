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
  it('passes through unchanged when the plan is explicitly unrestricted', () => {
    // ALLOW_ALL plans and administrators send an empty list on purpose, as a
    // fast path. That is the only case an empty list may mean "everything".
    const d = decision('OPENAI', 'gpt-4o', [{ provider: 'ANTHROPIC', model: 'claude' }]);
    const res = applyPlanModelGate(d, [], true);
    expect(res.outcome).toBe('unrestricted');
    expect(res.decision.selectedProvider).toBe('OPENAI');
    expect(res.decision.fallbackChain).toHaveLength(1);
  });

  it('authorizes nothing when a restricted plan has an empty allow-list', () => {
    // Regression. An empty list used to mean "no restriction" regardless of the
    // plan, so a plan configured to grant nothing was handed the entire
    // catalogue — the exact inversion of what the operator set up.
    const d = decision('OPENAI', 'gpt-4o', [{ provider: 'ANTHROPIC', model: 'claude' }]);
    const res = applyPlanModelGate(d, []);
    expect(res.outcome).toBe('unsatisfiable');
  });

  it('defaults to restricted when the caller does not say otherwise', () => {
    // The unrestricted flag defaults to false so a caller that has not been
    // updated becomes MORE restrictive, never less.
    const d = decision('OPENAI', 'gpt-4o', []);
    expect(applyPlanModelGate(d, []).outcome).toBe('unsatisfiable');
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
