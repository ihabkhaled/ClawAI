import type { UserEntitlements } from '@claw/shared-entitlements';
import { Permission, PlanModelAccessMode } from '@claw/shared-types';

import { type CatalogModel, ThreadModelAvailability } from '../../types/recommended-team.types';
import {
  buildRecommendedTeam,
  classifyCatalog,
  listExcludedModels,
} from '../recommended-team.utility';

const model = (provider: string, id: string, extra: Partial<CatalogModel> = {}): CatalogModel => ({
  provider,
  model: id,
  windowTokens: 1_000_000,
  usageTier: 'LOW',
  ...extra,
});

function entitlements(): UserEntitlements {
  return {
    userId: 'owner-1',
    role: 'USER',
    isAdmin: false,
    permissions: [Permission.THREAD_GENERATION_USE],
    modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
    allowedModels: [],
    plan: null,
    allowedProviders: [],
    quota: { dailyLimit: 0, used: 0, remaining: 0, unlimited: false, adminBypass: false },
  } as unknown as UserEntitlements;
}

const catalog: CatalogModel[] = [
  model('GEMINI', 'gemini-2.5-flash-lite'),
  model('GEMINI', 'gemini-2.5-pro', { usageTier: 'HIGH' }),
  model('GROK', 'grok-4-fast'),
  model('OLLAMA', 'gpt-oss:20b', { windowTokens: null }),
];

describe('recommended team uses the last hour of model health (ADR-183)', () => {
  const failing = new Map([['GEMINI/gemini-2.5-flash-lite', { ok: 1, failed: 9 }]]);

  it('marks a usable model DEGRADED when it mostly failed over enough calls', () => {
    const rows = classifyCatalog(entitlements(), catalog, failing);
    const row = rows.find(({ model: id }) => id === 'gemini-2.5-flash-lite');
    expect(row?.status).toBe(ThreadModelAvailability.DEGRADED);
    expect(row?.recentHealth).toEqual({ successRate: 0.1, samples: 10 });
    expect(rows.find(({ model: id }) => id === 'grok-4-fast')?.status).toBe(
      ThreadModelAvailability.AVAILABLE,
    );
  });

  it('does not demote on too few calls or a healthy rate', () => {
    const few = new Map([['GEMINI/gemini-2.5-flash-lite', { ok: 0, failed: 4 }]]);
    const fine = new Map([['GEMINI/gemini-2.5-flash-lite', { ok: 8, failed: 2 }]]);
    for (const health of [few, fine]) {
      const row = classifyCatalog(entitlements(), catalog, health).find(
        ({ model: id }) => id === 'gemini-2.5-flash-lite',
      );
      expect(row?.status).toBe(ThreadModelAvailability.AVAILABLE);
    }
  });

  it('demotes a model nobody has called yet when its whole provider is failing', () => {
    const outage = new Map([
      ['GEMINI/gemini-2.5-flash-lite', { ok: 0, failed: 6 }],
      ['GEMINI/gemini-2.5-flash', { ok: 1, failed: 5 }],
    ]);
    const row = classifyCatalog(entitlements(), catalog, outage).find(
      ({ model: id }) => id === 'gemini-2.5-pro',
    );
    expect(row?.status).toBe(ThreadModelAvailability.DEGRADED);
  });

  it('keeps a degraded model selectable: it is not in the excluded list', () => {
    expect(listExcludedModels(entitlements(), catalog).map(({ model: id }) => id)).not.toContain(
      'gemini-2.5-flash-lite',
    );
  });

  it('never preselects a degraded model and orders healthy models by success rate', () => {
    const health = new Map([
      ['GEMINI/gemini-2.5-flash-lite', { ok: 1, failed: 9 }],
      ['GEMINI/gemini-2.5-pro', { ok: 1, failed: 9 }],
      ['GROK/grok-4-fast', { ok: 6, failed: 4 }],
      ['OLLAMA/gpt-oss:20b', { ok: 10, failed: 0 }],
    ]);
    const team = buildRecommendedTeam(entitlements(), catalog, health);
    const seats = [...(team?.authors ?? []), team?.judge, team?.critic];
    expect(seats.map((seat) => seat?.model)).not.toContain('gemini-2.5-flash-lite');
    expect(team?.authors[0]?.model).toBe('gpt-oss:20b');
    expect(team?.authors[1]?.model).toBe('grok-4-fast');
  });

  it('falls back to degraded models when nothing healthy is left', () => {
    const all = new Map([['GEMINI/only', { ok: 0, failed: 9 }]]);
    const team = buildRecommendedTeam(entitlements(), [model('GEMINI', 'only')], all);
    expect(team?.judge.model).toBe('only');
  });
});
