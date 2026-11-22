import { describe, expect, it, vi } from 'vitest';
import type { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import type { ModelCostService } from '../services/model-cost.service';
import { ModelVisibilityService } from '../services/model-visibility.service';

function build(record: unknown, costClass: string | null) {
  const registry = { findByProviderAndModelKey: vi.fn().mockResolvedValue(record) };
  const costs = {
    resolveCostClasses: vi
      .fn()
      .mockResolvedValue([{ provider: 'GEMINI', model: 'models/x', costClass }]),
  };
  const service = new ModelVisibilityService(
    registry as unknown as RouterModelRegistryRepository,
    costs as unknown as ModelCostService,
  );
  return { service, registry, costs };
}

describe('ModelVisibilityService', () => {
  it('reports a registry row with its lifecycle, router-only flag and cost class', async () => {
    const { service, costs } = build({ lifecycle: 'ACTIVE', isRouterOnly: false }, 'STANDARD');

    await expect(service.get('GEMINI', 'models/gemini-2.5-pro')).resolves.toEqual({
      provider: 'GEMINI',
      modelKey: 'models/gemini-2.5-pro',
      inRegistry: true,
      lifecycle: 'ACTIVE',
      isRouterOnly: false,
      costClass: 'STANDARD',
    });
    expect(costs.resolveCostClasses).toHaveBeenCalledWith([
      { provider: 'GEMINI', model: 'models/gemini-2.5-pro' },
    ]);
  });

  it('reports a model with no registry row and no price (the gemini-decision-1 case)', async () => {
    const { service } = build(null, null);

    await expect(service.get('GEMINI', 'models/gemini-decision-1')).resolves.toEqual({
      provider: 'GEMINI',
      modelKey: 'models/gemini-decision-1',
      inRegistry: false,
      lifecycle: null,
      isRouterOnly: null,
      costClass: null,
    });
  });

  it('flags a router-only model', async () => {
    const { service } = build({ lifecycle: 'ACTIVE', isRouterOnly: true }, 'ECONOMY');

    await expect(service.get('OLLAMA', 'router-model')).resolves.toMatchObject({
      isRouterOnly: true,
    });
  });
});
