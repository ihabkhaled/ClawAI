import type { UserEntitlements } from '@claw/shared-entitlements';
import { PlanModelAccessMode } from '@claw/shared-types';

import type { CatalogModel } from '../../types/recommended-team.types';
import { buildHealingPool } from '../healing-pool.utility';

const entitlements = {
  userId: 'owner-1',
  isAdmin: false,
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  allowedModels: [],
  plan: { name: 'Pro', slug: 'pro' },
} as unknown as UserEntitlements;

const model = (
  provider: string,
  name: string,
  usageTier: string | null,
  windowTokens: number | null = 128_000,
): CatalogModel => ({ provider, model: name, usageTier, windowTokens });

describe('buildHealingPool (ADR-181)', () => {
  it('orders by cost band, spreads over providers and carries window and cost hints', () => {
    const pool = buildHealingPool(entitlements, [
      model('GEMINI', 'pro', 'HIGH'),
      model('GEMINI', 'flash', 'LOW'),
      model('GEMINI', 'flash-lite', 'LOW'),
      model('GROK', 'mini', 'LOW'),
      model('NVIDIA', 'big', 'MEDIUM'),
    ]);

    expect(pool?.pool.map(({ provider, model: name }) => `${provider}/${name}`)).toEqual([
      'GEMINI/flash',
      'GROK/mini',
      'NVIDIA/big',
      'GEMINI/flash-lite',
      'GEMINI/pro',
    ]);
    expect(pool?.pool[0]).toEqual({
      provider: 'GEMINI',
      model: 'flash',
      windowTokens: 128_000,
      costRank: 0,
    });
  });

  it('names a Gemini flash model as the safe default', () => {
    const pool = buildHealingPool(entitlements, [
      model('GROK', 'mini', 'LOW'),
      model('GEMINI', 'gemini-2.5-flash', 'LOW'),
    ]);
    expect(pool?.safeDefault).toMatchObject({ provider: 'GEMINI', model: 'gemini-2.5-flash' });
  });

  it('has no safe default when the plan has no Gemini flash model', () => {
    expect(
      buildHealingPool(entitlements, [model('GROK', 'mini', 'LOW')])?.safeDefault,
    ).toBeUndefined();
  });

  it('keeps out the deny list (OpenAI) and a window that is too small', () => {
    const pool = buildHealingPool(entitlements, [
      model('OPENAI', 'gpt', 'LOW'),
      model('GROK', 'tiny', 'LOW', 4096),
      model('GROK', 'ok', 'LOW', 64_000),
    ]);
    expect(pool?.pool.map(({ model: name }) => name)).toEqual(['ok']);
  });

  it('counts a model with no published window as the assumed 32k window', () => {
    const pool = buildHealingPool(entitlements, [model('GROK', 'unknown', null, null)]);
    expect(pool?.pool[0]).toMatchObject({ windowTokens: 32_768, costRank: 4 });
  });

  it('caps the pool and returns nothing when no model is usable', () => {
    const many = Array.from({ length: 30 }, (_, index) => model(`P${String(index)}`, 'm', 'LOW'));
    expect(buildHealingPool(entitlements, many)?.pool).toHaveLength(8);
    expect(buildHealingPool(entitlements, [])).toBeUndefined();
    expect(buildHealingPool(entitlements, [model('OPENAI', 'gpt', 'LOW')])).toBeUndefined();
  });
});
