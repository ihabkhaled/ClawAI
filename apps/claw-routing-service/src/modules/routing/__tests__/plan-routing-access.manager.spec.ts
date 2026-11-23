import { vi } from 'vitest';
import { PlanRoutingAccessManager } from '../managers/plan-routing-access.manager';
import { type RoutingContext } from '../types/routing.types';

const base: RoutingContext = { message: 'hello', threadId: 'thread-1' };
const DENY_ALL = '__CLAW_PLAN_DENY_ALL__';
const CANDIDATES = [
  { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
  { provider: 'ANTHROPIC', model: 'claude-opus-5' },
  { provider: 'OLLAMA', model: 'glm-5.2' },
  { provider: 'OPENROUTER', model: 'unpriced-model' },
];
const CLASSES: Record<string, string | null> = {
  'models/gemini-2.5-flash': 'STANDARD',
  'claude-opus-5': 'PREMIUM',
  'glm-5.2': 'FREE',
  'unpriced-model': null,
};

const withCosts = () => {
  const resolveCostClasses = vi.fn(async (models: Array<{ provider: string; model: string }>) =>
    models.map((m) => ({ ...m, costClass: CLASSES[m.model] ?? null })),
  );
  return {
    manager: new PlanRoutingAccessManager({ resolveCostClasses } as never),
    resolveCostClasses,
  };
};

describe('PlanRoutingAccessManager.allowedKeys', () => {
  it('restricts nothing for an ALLOW_ALL plan or when no plan list was sent', async () => {
    const { manager, resolveCostClasses } = withCosts();
    expect(
      await manager.allowedKeys({ ...base, modelAccessAllowAll: true }, CANDIDATES),
    ).toBeNull();
    expect(await manager.allowedKeys(base, CANDIDATES)).toBeNull();
    expect(resolveCostClasses).not.toHaveBeenCalled();
  });

  it('a cost-class plan is offered the models in its classes, not nothing (the Free plan bug)', async () => {
    const { manager } = withCosts();
    const keys = await manager.allowedKeys(
      { ...base, allowedModels: [DENY_ALL], allowedCostClasses: ['FREE', 'CHEAP', 'STANDARD'] },
      CANDIDATES,
    );
    expect([...(keys ?? [])].sort()).toEqual(['GEMINI/gemini-2.5-flash', 'OLLAMA/glm-5.2']);
  });

  it('never offers an unpriced model to a cost-class plan, as the send gate refuses it', async () => {
    const { manager } = withCosts();
    const keys = await manager.allowedKeys(
      { ...base, allowedModels: [DENY_ALL], allowedCostClasses: ['FREE', 'PREMIUM'] },
      CANDIDATES,
    );
    expect(keys?.has('OPENROUTER/unpriced-model')).toBe(false);
    expect(keys?.has('ANTHROPIC/claude-opus-5')).toBe(true);
  });

  it('an empty class list offers nothing and resolves nothing', async () => {
    const { manager, resolveCostClasses } = withCosts();
    const keys = await manager.allowedKeys(
      { ...base, allowedModels: [DENY_ALL], allowedCostClasses: [] },
      CANDIDATES,
    );
    expect(keys?.size).toBe(0);
    expect(resolveCostClasses).not.toHaveBeenCalled();
  });

  it('an explicit-list plan reads its list, and the id may contain a slash', async () => {
    const { manager, resolveCostClasses } = withCosts();
    const keys = await manager.allowedKeys(
      { ...base, allowedModels: ['GEMINI/models/gemini-2.5-flash'] },
      CANDIDATES,
    );
    expect([...(keys ?? [])]).toEqual(['GEMINI/gemini-2.5-flash']);
    expect(resolveCostClasses).not.toHaveBeenCalled();
  });

  it('without a cost service it keeps the old explicit-list reading', async () => {
    const keys = await new PlanRoutingAccessManager().allowedKeys(
      { ...base, allowedModels: [DENY_ALL], allowedCostClasses: ['FREE'] },
      CANDIDATES,
    );
    expect(keys?.has('OLLAMA/glm-5.2')).toBe(false);
  });
});
