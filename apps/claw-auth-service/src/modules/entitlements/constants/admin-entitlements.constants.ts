import { type UserEntitlements } from '../types/entitlements.types';

export const ADMIN_ENTITLEMENT_PLAN: NonNullable<UserEntitlements['plan']> = {
  id: 'admin-unlimited',
  slug: 'admin',
  name: 'Admin',
  isTrial: false,
  trialEndsAt: null,
  isTrialExpired: false,
  limits: {
    dailyTokens: null,
    weeklyTokens: null,
    monthlyTokens: null,
    chatsPerDay: null,
  },
  featureGates: {
    allowCompareMode: true,
    allowJudgeMode: true,
    allowResearchMode: true,
    allowCriticReview: true,
    allowWorkspaces: true,
    allowMemory: true,
    allowContextPacks: true,
  },
};
