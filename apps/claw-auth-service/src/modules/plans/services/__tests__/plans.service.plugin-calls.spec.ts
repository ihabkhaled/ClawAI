import { type Mock, vi } from 'vitest';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import { PlansService } from '../plans.service';
import { type PlansRepository } from '../../repositories/plans.repository';
import { type ExposedModelClient } from '../../clients/exposed-model.client';

// The maxPluginCallsPerDay column and the PLUGIN_CALLS rule are written in ONE transaction by
// PlansRepository (proven in plans.repository.plugin-calls.spec.ts). These specs prove the
// service no longer writes the rule as a second, separate step: each plan write is a single
// repository call, so the payload it returns is the row whose rule was just enforced.
type Harness = {
  service: PlansService;
  repo: { findBySlug: Mock; create: Mock; update: Mock; findById: Mock };
};

const planRow = (maxPluginCallsPerDay: number | null) => ({
  id: 'plan-x',
  slug: 'x',
  name: 'X',
  currency: 'USD',
  isTrial: false,
  trialDurationDays: null,
  maxPluginCallsPerDay,
  modelAccess: [],
});

const build = (): Harness => {
  const repo = { findBySlug: vi.fn(), create: vi.fn(), update: vi.fn(), findById: vi.fn() };
  const service = new PlansService(
    repo as unknown as PlansRepository,
    { findExposed: vi.fn() } as unknown as ExposedModelClient,
    { publish: vi.fn(async () => {}) } as unknown as RabbitMQService,
  );
  return { service, repo };
};

describe('PlansService PLUGIN_CALLS cap', () => {
  it('creates a plan through one repository call and returns the stored cap', async () => {
    const { service, repo } = build();
    repo.findBySlug.mockResolvedValue(null);
    repo.create.mockResolvedValue(planRow(20));

    const view = await service.createPlan({ name: 'X', slug: 'x', dailyTokenQuota: 1 } as never);

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(view.maxPluginCallsPerDay).toBe(20);
  });

  it('updates the cap through one repository call and returns the new cap', async () => {
    const { service, repo } = build();
    repo.findById.mockResolvedValue(planRow(20));
    repo.update.mockResolvedValue(planRow(750));

    const view = await service.updatePlan('plan-x', { maxPluginCallsPerDay: 750 });

    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledWith('plan-x', { maxPluginCallsPerDay: 750 });
    expect(view.maxPluginCallsPerDay).toBe(750);
  });

  it('keeps null (unlimited) and 0 (disabled) distinct in the returned payload', async () => {
    const { service, repo } = build();
    repo.findById.mockResolvedValue(planRow(20));

    repo.update.mockResolvedValueOnce(planRow(null));
    const unlimited = await service.updatePlan('plan-x', { maxPluginCallsPerDay: null });
    repo.update.mockResolvedValueOnce(planRow(0));
    const disabled = await service.updatePlan('plan-x', { maxPluginCallsPerDay: 0 });

    expect(unlimited.maxPluginCallsPerDay).toBeNull();
    expect(disabled.maxPluginCallsPerDay).toBe(0);
  });

  it('surfaces a failed plan write instead of reporting a cap that was not enforced', async () => {
    const { service, repo } = build();
    repo.findById.mockResolvedValue(planRow(20));
    repo.update.mockRejectedValue(new Error('transaction rolled back'));

    await expect(service.updatePlan('plan-x', { maxPluginCallsPerDay: 5 })).rejects.toThrow(
      'transaction rolled back',
    );
  });
});
