import { resolvePlanLimit } from '../helpers';
import type { UserEntitlements } from '../types';

type LimitFacts = Pick<UserEntitlements, 'isAdmin' | 'plan'>;

function facts(
  isAdmin: boolean,
  limits: Partial<NonNullable<UserEntitlements['plan']>['limits']> | null,
): LimitFacts {
  return limits === null
    ? { isAdmin, plan: null }
    : {
        isAdmin,
        plan: {
          id: 'plan-1',
          slug: 'pro',
          name: 'Pro',
          isTrial: false,
          trialEndsAt: null,
          isTrialExpired: false,
          limits: {
            dailyTokens: 500_000,
            weeklyTokens: 2_000_000,
            monthlyTokens: null,
            chatsPerDay: null,
            messagesPerDay: null,
            workspaceConnections: null,
            contextPacks: null,
            memoryItems: null,
            maxVideoSeconds: null,
            maxInstalledPlugins: null,
            maxUserMcpServers: null,
            maxPluginCallsPerDay: null,
            ...limits,
          },
          featureGates: {} as NonNullable<UserEntitlements['plan']>['featureGates'],
        },
      };
}

// Regression suite for a live production defect. Six call sites across four
// services wrote `entitlements.plan?.limits.chatsPerDay ?? 0`. On every paid
// tier that limit is `null`, meaning UNLIMITED — and `??` turned it into `0`,
// which means DISABLED. Pro, Team, Scale and Unlimited customers were refused
// their very first thread with PLAN_DAILY_CHAT_LIMIT_EXCEEDED while Free, the
// only tier with a real number, worked perfectly.
describe('resolvePlanLimit', () => {
  it('preserves null as UNLIMITED and never coalesces it to zero', () => {
    expect(resolvePlanLimit(facts(false, { chatsPerDay: null }), (l) => l.chatsPerDay)).toBeNull();
  });

  it('returns a real limit unchanged', () => {
    expect(resolvePlanLimit(facts(false, { chatsPerDay: 5 }), (l) => l.chatsPerDay)).toBe(5);
  });

  // 0 and null are NOT interchangeable, and this is the pair that proves it.
  it('keeps zero meaning DISABLED, distinct from unlimited', () => {
    expect(resolvePlanLimit(facts(false, { chatsPerDay: 0 }), (l) => l.chatsPerDay)).toBe(0);
    expect(resolvePlanLimit(facts(false, { chatsPerDay: null }), (l) => l.chatsPerDay)).not.toBe(0);
  });

  it('gives an administrator no limit at all', () => {
    expect(resolvePlanLimit(facts(true, { chatsPerDay: 5 }), (l) => l.chatsPerDay)).toBeNull();
  });

  // The one case where 0 is right, and the reason the broken coalesce looked
  // plausible: an account with no plan has no allowance to spend.
  it('disables an account that has no plan', () => {
    expect(resolvePlanLimit(facts(false, null), (l) => l.chatsPerDay)).toBe(0);
  });

  it.each([
    ['chatsPerDay', (l: NonNullable<UserEntitlements['plan']>['limits']) => l.chatsPerDay],
    ['messagesPerDay', (l: NonNullable<UserEntitlements['plan']>['limits']) => l.messagesPerDay],
    ['contextPacks', (l: NonNullable<UserEntitlements['plan']>['limits']) => l.contextPacks],
    ['memoryItems', (l: NonNullable<UserEntitlements['plan']>['limits']) => l.memoryItems],
    ['maxVideoSeconds', (l: NonNullable<UserEntitlements['plan']>['limits']) => l.maxVideoSeconds],
    [
      'maxInstalledPlugins',
      (l: NonNullable<UserEntitlements['plan']>['limits']) => l.maxInstalledPlugins,
    ],
    [
      'maxUserMcpServers',
      (l: NonNullable<UserEntitlements['plan']>['limits']) => l.maxUserMcpServers,
    ],
    [
      'maxPluginCallsPerDay',
      (l: NonNullable<UserEntitlements['plan']>['limits']) => l.maxPluginCallsPerDay,
    ],
    [
      'workspaceConnections',
      (l: NonNullable<UserEntitlements['plan']>['limits']) => l.workspaceConnections,
    ],
  ])('treats an unlimited %s as unlimited', (_name, select) => {
    expect(resolvePlanLimit(facts(false, {}), select)).toBeNull();
  });

  // Plugins: Free installs 5 and registers 0 own servers. 0 is DISABLED, not unlimited.
  it('keeps 0 own MCP servers as disabled and a numeric install cap as that number', () => {
    expect(
      resolvePlanLimit(facts(false, { maxUserMcpServers: 0 }), (l) => l.maxUserMcpServers),
    ).toBe(0);
    expect(
      resolvePlanLimit(facts(false, { maxInstalledPlugins: 5 }), (l) => l.maxInstalledPlugins),
    ).toBe(5);
    expect(
      resolvePlanLimit(facts(true, { maxUserMcpServers: 0 }), (l) => l.maxUserMcpServers),
    ).toBeNull();
  });

  // Plugin calls: Free gets 20 a day. 0 is DISABLED and null is unlimited.
  it('keeps a numeric daily plugin-call cap, 0 as disabled and null as unlimited', () => {
    const select = (l: NonNullable<UserEntitlements['plan']>['limits']) => l.maxPluginCallsPerDay;
    expect(resolvePlanLimit(facts(false, { maxPluginCallsPerDay: 20 }), select)).toBe(20);
    expect(resolvePlanLimit(facts(false, { maxPluginCallsPerDay: 0 }), select)).toBe(0);
    expect(resolvePlanLimit(facts(false, { maxPluginCallsPerDay: null }), select)).toBeNull();
    expect(resolvePlanLimit(facts(true, { maxPluginCallsPerDay: 0 }), select)).toBeNull();
  });

  // ADR-122: free processes 60 s of video; 0 would switch video off entirely.
  it('passes a video-length cap through, and keeps 0 as disabled', () => {
    expect(resolvePlanLimit(facts(false, { maxVideoSeconds: 60 }), (l) => l.maxVideoSeconds)).toBe(
      60,
    );
    expect(resolvePlanLimit(facts(false, { maxVideoSeconds: 0 }), (l) => l.maxVideoSeconds)).toBe(
      0,
    );
  });
});
