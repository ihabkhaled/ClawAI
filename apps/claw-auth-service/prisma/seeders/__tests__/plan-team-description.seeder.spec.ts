import { vi } from 'vitest';

const seeder = require('../plan-team-description.seeder.cjs');
const planCatalog = require('../plan-catalog.seeder.cjs');

type PlanDefinition = {
  slug: string;
  description: string;
  monthlyMinor: number;
  yearlyMinor: number;
  dailyTokens: number;
  weeklyTokens: number;
  monthlyTokens: number;
  costCeilingMicroUsd: string;
  workspaces: number;
};

function teamDefinition(): PlanDefinition {
  const team = planCatalog.PLAN_CATALOG.find((plan: PlanDefinition) => plan.slug === 'team');
  if (team === undefined) {
    throw new Error('team plan missing from the catalog');
  }
  return team;
}

describe('plan-team-description seeder', () => {
  it('replaces only the old description, keyed on the old text', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const result = await seeder.run({ plan: { updateMany } });

    expect(result).toEqual({ updated: 1 });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { slug: 'team', description: 'Shared workspaces and a large pooled allowance.' },
      data: { description: seeder.NEXT_DESCRIPTION },
    });
  });

  it('writes the description column and nothing else', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    await seeder.run({ plan: { updateMany } });

    const [{ data }] = updateMany.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(Object.keys(data)).toEqual(['description']);
  });

  it('is a no-op when the text was already changed', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    await expect(seeder.run({ plan: { updateMany } })).resolves.toEqual({ updated: 0 });
  });

  it('uses the catalog text, which promises no pooling or shared billing', () => {
    expect(seeder.NEXT_DESCRIPTION).toBe(teamDefinition().description);
    expect(seeder.NEXT_DESCRIPTION).not.toMatch(/pool|shared|seat|team billing/i);
  });

  it('leaves the Team plan limits unchanged', () => {
    const team = teamDefinition();
    expect(team.monthlyMinor).toBe(5000);
    // 5000 x 12 x 80% (ADR-135); the plan's own limits are what this test pins.
    expect(team.yearlyMinor).toBe(48000);
    expect(team.dailyTokens).toBe(1250000);
    expect(team.weeklyTokens).toBe(5000000);
    expect(team.monthlyTokens).toBe(12500000);
    expect(team.costCeilingMicroUsd).toBe('12500000');
    expect(team.workspaces).toBe(15);
  });

  it('does not change the plan-catalog checksum payload', () => {
    const payload = planCatalog.payload.find((entry: { slug: string }) => entry.slug === 'team');
    expect(payload).not.toHaveProperty('description');
  });
});
