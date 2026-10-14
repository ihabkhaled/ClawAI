import type { UserEntitlements } from '@claw/shared-entitlements';
import { Permission, PlanModelAccessMode } from '@claw/shared-types';

import { type CatalogModel, ThreadModelAvailability } from '../../types/recommended-team.types';
import {
  buildRecommendedTeam,
  classifyCatalog,
  classifyModel,
  listExcludedModels,
} from '../recommended-team.utility';

const model = (provider: string, id: string, extra: Partial<CatalogModel> = {}): CatalogModel => ({
  provider,
  model: id,
  windowTokens: 1_000_000,
  usageTier: 'LOW',
  ...extra,
});

const allowed = (provider: string, id: string) => ({
  provider,
  model: id,
  isAllowed: true,
  allowAsPrimary: true,
  allowAsFallback: true,
  allowAsJudge: false,
  allowInCompare: true,
  dailyTokenLimitOverride: null,
});

function entitlements(overrides: Partial<UserEntitlements> = {}): UserEntitlements {
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
    ...overrides,
  };
}

const catalog: CatalogModel[] = [
  model('GEMINI', 'gemini-2.5-flash-lite'),
  model('GEMINI', 'gemini-2.5-pro', { usageTier: 'HIGH' }),
  model('GROK', 'grok-4-fast'),
  model('OLLAMA', 'gpt-oss:20b', { windowTokens: null }),
  model('OPENAI', 'gpt-5-mini'),
  model('ANTHROPIC', 'claude-haiku'),
];

describe('classifyModel', () => {
  it('keeps a denied provider out even when the plan allows everything', () => {
    expect(classifyModel(entitlements(), model('OPENAI', 'gpt-5-mini'))).toBe(
      ThreadModelAvailability.UNAVAILABLE,
    );
    expect(classifyModel(entitlements(), model('ANTHROPIC', 'claude-haiku'))).toBe(
      ThreadModelAvailability.UNAVAILABLE,
    );
  });

  it('marks a model the plan does not list as needing a plan, with the preflight test', () => {
    const free = entitlements({
      modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
      allowedModels: [allowed('OLLAMA', 'gpt-oss:20b')],
    });

    expect(classifyModel(free, model('GEMINI', 'gemini-2.5-pro'))).toBe(
      ThreadModelAvailability.NEEDS_PLAN,
    );
    expect(classifyModel(free, model('OLLAMA', 'gpt-oss:20b'))).toBe(
      ThreadModelAvailability.AVAILABLE,
    );
  });

  it('accepts an unknown window through the assumed one and refuses a small known one', () => {
    expect(classifyModel(entitlements(), model('OLLAMA', 'x', { windowTokens: null }))).toBe(
      ThreadModelAvailability.AVAILABLE,
    );
    expect(classifyModel(entitlements(), model('OLLAMA', 'x', { windowTokens: 8192 }))).toBe(
      ThreadModelAvailability.WINDOW_TOO_SMALL,
    );
  });

  it('lets an admin use any model that is not denied', () => {
    const admin = entitlements({ isAdmin: true, modelAccessMode: PlanModelAccessMode.DENY_ALL });

    expect(classifyModel(admin, model('GEMINI', 'gemini-2.5-pro'))).toBe(
      ThreadModelAvailability.AVAILABLE,
    );
  });
});

describe('classifyCatalog', () => {
  it('returns one status row per catalog model', () => {
    const rows = classifyCatalog(entitlements(), catalog);

    expect(rows).toHaveLength(catalog.length);
    expect(rows.find((row) => row.provider === 'OPENAI')?.status).toBe(
      ThreadModelAvailability.UNAVAILABLE,
    );
  });
});

describe('buildRecommendedTeam', () => {
  it('spreads five seats over providers, cheapest band first, skipping denied providers', () => {
    const team = buildRecommendedTeam(entitlements(), catalog);

    expect(team?.authors.map(({ provider, model: id }) => `${provider}/${id}`)).toEqual([
      'GEMINI/gemini-2.5-flash-lite',
      'GROK/grok-4-fast',
      'OLLAMA/gpt-oss:20b',
    ]);
    expect(team?.judge).toMatchObject({ provider: 'GEMINI', model: 'gemini-2.5-pro' });
    expect(team?.critic).toMatchObject({ provider: 'GEMINI', model: 'gemini-2.5-flash-lite' });
  });

  it('gives each seat up to two fallbacks on other providers', () => {
    const team = buildRecommendedTeam(entitlements(), catalog);

    for (const seat of [...(team?.authors ?? []), team?.judge, team?.critic]) {
      expect(seat?.fallbacks.length).toBeLessThanOrEqual(2);
      expect(seat?.fallbacks.length).toBeGreaterThan(0);
      expect(seat?.fallbacks.every((fallback) => fallback.provider !== seat.provider)).toBe(true);
    }
  });

  it('repeats the one usable model when it is all there is, with no fallback', () => {
    const team = buildRecommendedTeam(entitlements(), [model('GEMINI', 'only')]);

    expect(team?.authors).toHaveLength(3);
    expect(team?.critic).toEqual({ provider: 'GEMINI', model: 'only', fallbacks: [] });
  });

  it('never picks a model the plan excludes', () => {
    const free = entitlements({
      modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
      allowedModels: [allowed('OLLAMA', 'gpt-oss:20b')],
    });
    const team = buildRecommendedTeam(free, catalog);

    expect(new Set(team?.authors.map(({ provider }) => provider))).toEqual(new Set(['OLLAMA']));
  });

  it('answers null when nothing is usable', () => {
    expect(buildRecommendedTeam(entitlements(), [model('OPENAI', 'gpt-5-mini')])).toBeNull();
    expect(buildRecommendedTeam(entitlements(), [])).toBeNull();
  });
});

describe('listExcludedModels', () => {
  const free = entitlements({
    modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
    allowedModels: [allowed('OLLAMA', 'gpt-oss:20b')],
  });

  it('lists every unusable model with its single reason and leaves usable ones out', () => {
    const excluded = listExcludedModels(free, [
      model('GEMINI', 'gemini-2.5-pro'),
      model('OLLAMA', 'gpt-oss:20b'),
      model('OLLAMA', 'tiny', { windowTokens: 8192 }),
      model('OPENAI', 'gpt-5-mini'),
    ]);

    expect(excluded).toEqual([
      { provider: 'GEMINI', model: 'gemini-2.5-pro', reasonIfExcluded: 'NEEDS_PLAN' },
      { provider: 'OLLAMA', model: 'tiny', reasonIfExcluded: 'NEEDS_PLAN' },
      { provider: 'OPENAI', model: 'gpt-5-mini', reasonIfExcluded: 'UNAVAILABLE' },
    ]);
  });

  it('reports a small window as its own reason when the plan allows the model', () => {
    expect(
      listExcludedModels(entitlements(), [model('OLLAMA', 'tiny', { windowTokens: 8192 })]),
    ).toEqual([{ provider: 'OLLAMA', model: 'tiny', reasonIfExcluded: 'WINDOW_TOO_SMALL' }]);
  });

  it('keeps every excluded model out of the team and its fallbacks for a Free plan', () => {
    const team = buildRecommendedTeam(free, catalog);
    const seats = team ? [...team.authors, team.judge, team.critic] : [];
    const refs = seats.flatMap((seat) => [seat, ...seat.fallbacks]);

    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((ref) => ref.provider === 'OLLAMA' && ref.model === 'gpt-oss:20b')).toBe(
      true,
    );
  });
});
