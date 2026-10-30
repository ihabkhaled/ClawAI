import { ForbiddenException } from '@nestjs/common';
import type { UserEntitlements } from '@claw/shared-entitlements';
import { ModelCostClass, PlanModelAccessMode } from '@claw/shared-types';

import { ThreadGenerationRoleKind } from '../../../../common/enums/thread-generation-role-kind.enum';
import type { PreflightRole } from '../../types/generation-preflight.types';
import { type CatalogModel, ThreadModelAvailability } from '../../types/recommended-team.types';
import { assertModelsOnPlan } from '../generation-preflight.utility';
import { buildHealingPool } from '../healing-pool.utility';
import type { CostClassIndex } from '../../types/model-cost-class.types';
import { costClassKey } from '../model-cost-class.utility';
import {
  buildRecommendedTeam,
  classifyCatalog,
  classifyModel,
  listExcludedModels,
} from '../recommended-team.utility';

// A Free-style plan that allows the cheap classes only. Before ADR-198 reached Threads, the helper
// was called with no class and refused every model on this plan.
const free = {
  userId: 'owner-1',
  isAdmin: false,
  permissions: [],
  modelAccessMode: PlanModelAccessMode.ALLOW_COST_CLASSES,
  allowedCostClasses: [ModelCostClass.FREE, ModelCostClass.CHEAP],
  allowedModels: [],
  plan: { name: 'Free', slug: 'free' },
} as unknown as UserEntitlements;

const base = { windowTokens: 1_000_000 };
const cheap: CatalogModel = { ...base, provider: 'GEMINI', model: 'flash', usageTier: 'LOW' };
const premium: CatalogModel = { ...base, provider: 'GEMINI', model: 'pro', usageTier: 'HIGH' };
const unpriced: CatalogModel = { ...base, provider: 'GROK', model: 'new', usageTier: null };
const other: CatalogModel = { ...base, provider: 'OLLAMA', model: 'mini', usageTier: 'LOW' };

const classes: CostClassIndex = new Map([
  [costClassKey('GEMINI', 'flash'), ModelCostClass.CHEAP],
  [costClassKey('GEMINI', 'pro'), ModelCostClass.PREMIUM],
  [costClassKey('GROK', 'new'), null],
  [costClassKey('OLLAMA', 'mini'), ModelCostClass.CHEAP],
]);
const routingDown: CostClassIndex = new Map();

describe('Threads plan checks on a cost-class plan (ADR-198)', () => {
  it('allows a cheap model, refuses premium and unpriced', () => {
    expect(classifyModel(free, cheap, classes)).toBe(ThreadModelAvailability.AVAILABLE);
    expect(classifyModel(free, premium, classes)).toBe(ThreadModelAvailability.NEEDS_PLAN);
    expect(classifyModel(free, unpriced, classes)).toBe(ThreadModelAvailability.NEEDS_PLAN);
  });

  it('refuses everything when routing is down (fail closed)', () => {
    expect(classifyModel(free, cheap, routingDown)).toBe(ThreadModelAvailability.NEEDS_PLAN);
    expect(classifyModel(free, cheap)).toBe(ThreadModelAvailability.NEEDS_PLAN);
  });

  it('builds a team from the allowed models and lists the rest as excluded', () => {
    const catalog = [cheap, premium, unpriced, other];
    const team = buildRecommendedTeam(free, catalog, new Map(), classes);
    const seats = [...(team?.authors ?? []), team?.judge, team?.critic].map((seat) => seat?.model);
    expect(new Set(seats)).toEqual(new Set(['flash', 'mini']));
    expect(listExcludedModels(free, catalog, classes).map(({ model }) => model)).toEqual([
      'pro',
      'new',
    ]);
    expect(classifyCatalog(free, catalog, new Map(), classes).map(({ status }) => status)).toEqual([
      'AVAILABLE',
      'NEEDS_PLAN',
      'NEEDS_PLAN',
      'AVAILABLE',
    ]);
    expect(buildRecommendedTeam(free, catalog, new Map(), routingDown)).toBeNull();
  });

  it('puts only allowed models in the healing pool', () => {
    const pool = buildHealingPool(free, [cheap, premium, unpriced, other], classes);
    expect(pool?.pool.map(({ model }) => model).sort()).toEqual(['flash', 'mini']);
    expect(buildHealingPool(free, [cheap], routingDown)).toBeUndefined();
  });

  describe('start preflight', () => {
    const role = (model: CatalogModel, isFallback = false): PreflightRole => ({
      kind: ThreadGenerationRoleKind.AUTHOR,
      roleId: 'author-1',
      position: 1,
      provider: model.provider,
      model: model.model,
      isFallback,
    });

    it('lets a Free user start with a cheap primary and a cheap fallback', () => {
      expect(() =>
        assertModelsOnPlan(free, [role(cheap), role(other, true)], classes),
      ).not.toThrow();
    });

    it('refuses a premium or unpriced model with the plan error', () => {
      expect(() => assertModelsOnPlan(free, [role(premium)], classes)).toThrow(ForbiddenException);
      expect(() => assertModelsOnPlan(free, [role(cheap), role(unpriced, true)], classes)).toThrow(
        ForbiddenException,
      );
    });

    it('refuses when no class could be read', () => {
      expect(() => assertModelsOnPlan(free, [role(cheap)], routingDown)).toThrow(
        ForbiddenException,
      );
    });
  });
});
