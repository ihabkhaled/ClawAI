import { Permission, PlanModelAccessMode } from '@claw/shared-types';
import {
  allowedModelKeys,
  hasPermission,
  hasPlanFeature,
  isModelAllowedForUsage,
} from '../helpers';
import { ModelUsageType, type UserEntitlements } from '../types';

const base: UserEntitlements = {
  userId: 'u1',
  role: 'USER',
  isAdmin: false,
  permissions: [Permission.CHAT_USE],
  plan: {
    id: 'p1',
    slug: 'free',
    name: 'Free',
    featureGates: {
      allowCompareMode: false,
      allowJudgeMode: false,
      allowResearchMode: false,
      allowCriticReview: false,
      allowWorkspaces: true,
      allowMemory: true,
      allowContextPacks: true,
    },
  },
  modelAccessMode: PlanModelAccessMode.ALLOW_ALL,
  allowedModels: [],
  allowedProviders: [],
  quota: { dailyLimit: 50000, used: 0, remaining: 50000, unlimited: false },
};

const admin: UserEntitlements = { ...base, role: 'ADMIN', isAdmin: true, permissions: [] };

const withModel = (
  overrides: Partial<UserEntitlements['allowedModels'][number]>,
): UserEntitlements => ({
  ...base,
  modelAccessMode: PlanModelAccessMode.ALLOW_LIST,
  allowedModels: [
    {
      provider: 'OPENAI',
      model: 'gpt-4o',
      isAllowed: true,
      allowAsPrimary: true,
      allowAsFallback: true,
      allowAsJudge: false,
      allowInCompare: true,
      dailyTokenLimitOverride: null,
      ...overrides,
    },
  ],
});

describe('entitlements helpers', () => {
  describe('hasPermission', () => {
    it('ADMIN has every permission', () => {
      expect(hasPermission(admin, Permission.ADMIN_PLANS_MANAGE)).toBe(true);
    });
    it('USER has only granted permissions', () => {
      expect(hasPermission(base, Permission.CHAT_USE)).toBe(true);
      expect(hasPermission(base, Permission.ADMIN_PLANS_MANAGE)).toBe(false);
    });
  });

  describe('hasPlanFeature', () => {
    it('ADMIN has every feature', () => {
      expect(hasPlanFeature(admin, 'allowCompareMode')).toBe(true);
    });
    it('USER follows plan gates', () => {
      expect(hasPlanFeature(base, 'allowMemory')).toBe(true);
      expect(hasPlanFeature(base, 'allowCompareMode')).toBe(false);
      expect(hasPlanFeature(base, 'allowCriticReview')).toBe(false);
    });
    it('ADMIN bypasses allowCriticReview even when plan locks it', () => {
      expect(hasPlanFeature(admin, 'allowCriticReview')).toBe(true);
    });
  });

  describe('isModelAllowedForUsage', () => {
    it('ADMIN can use any model', () => {
      expect(
        isModelAllowedForUsage(admin, 'ANTHROPIC', 'claude-opus', ModelUsageType.PRIMARY),
      ).toBe(true);
    });
    it('empty allowedModels = allow all (v1 hot path)', () => {
      expect(isModelAllowedForUsage(base, 'ANYTHING', 'any', ModelUsageType.PRIMARY)).toBe(true);
    });
    it('DENY_ALL rejects every model even when the row list is empty', () => {
      const ent = { ...base, modelAccessMode: PlanModelAccessMode.DENY_ALL };
      expect(isModelAllowedForUsage(ent, 'OPENAI', 'gpt-4o', ModelUsageType.PRIMARY)).toBe(false);
    });
    it('restricted plan allows only listed models in the right mode', () => {
      const ent = withModel({});
      expect(isModelAllowedForUsage(ent, 'OPENAI', 'gpt-4o', ModelUsageType.PRIMARY)).toBe(true);
      expect(isModelAllowedForUsage(ent, 'OPENAI', 'gpt-4o', ModelUsageType.JUDGE)).toBe(false);
      expect(isModelAllowedForUsage(ent, 'ANTHROPIC', 'claude-opus', ModelUsageType.PRIMARY)).toBe(
        false,
      );
    });
  });

  describe('allowedModelKeys', () => {
    it('flattens to provider/model keys', () => {
      expect(allowedModelKeys(withModel({}))).toEqual(['OPENAI/gpt-4o']);
    });
    it('returns [] when unrestricted', () => {
      expect(allowedModelKeys(base)).toEqual([]);
    });
    it('returns a restrictive key when the plan denies every model', () => {
      const ent = { ...base, modelAccessMode: PlanModelAccessMode.DENY_ALL };
      expect(allowedModelKeys(ent)).not.toEqual([]);
    });
  });
});
