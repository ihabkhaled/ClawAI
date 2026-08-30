import type { PaygMeter } from '@claw/shared-entitlements';
import { Permission, UserRole } from '@claw/shared-types';
import { AccessControlService } from '../services/access-control.service';
import { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse, MessageRoutedData } from '../types/execution.types';
import type { JudgeRefereeConfig } from '../types/judge-referee.types';
import { JudgeDecision } from '../../../common/enums';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../utilities/assembled-context.utility';

// Slice C — plan gate proof for the compare / judge / critic paths.
//
// We exercise the real AccessControlService against a mocked
// EntitlementsAdapter so we test the actual production gate logic (the same
// code that runs in createParallelMessage → assertCompareAccess and inside
// JudgeRefereeManager → callCriticWithModel).
//
// Coverage:
//  - allowCompareMode=false                → PLAN_FEATURE_DISABLED 403
//  - allowJudgeMode=false   (judge run)    → PLAN_FEATURE_DISABLED 403
//  - allowCriticReview=false (critic run)  → JudgeRefereeManager swallows the
//    rejection inside its callCritic catch and persists the parse-failure
//    critic marker (critic SKIPPED, judge still runs). This is the impl
//    chosen behavior — verified by reading judge-referee.manager.ts L243-251.
//  - All three features unlocked           → every gate passes through.
//  - COMPARE_USE / JUDGE_USE permissions   → 403 INSUFFICIENT_PERMISSIONS
//    when missing, success when held (mirrors the assertCompareAccess
//    permission re-checks at chat-messages.service.ts L325-337).
//  - ADMIN bypass through every gate.

const getEntitlements = jest.fn();

jest.mock('@claw/shared-entitlements', () => {
  const actual = jest.requireActual('@claw/shared-entitlements');
  return {
    ...actual,
    EntitlementsAdapter: jest.fn().mockImplementation(() => ({
      getEntitlements: (...args: unknown[]) => getEntitlements(...args),
      finalizeQuota: jest.fn(),
    })),
  };
});

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn().mockReturnValue({ AUTH_SERVICE_URL: 'http://auth:4001' }) },
}));

type EntitlementOverrides = {
  isAdmin?: boolean;
  role?: string;
  permissions?: Permission[];
  featureGates?: {
    allowCompareMode?: boolean;
    allowJudgeMode?: boolean;
    allowCriticReview?: boolean;
    allowResearchMode?: boolean;
  };
  quota?: { dailyLimit: number; used: number; remaining: number; unlimited: boolean };
};

function makeEntitlements(overrides: EntitlementOverrides = {}): unknown {
  return {
    userId: 'u1',
    role: overrides.role ?? UserRole.USER,
    isAdmin: overrides.isAdmin ?? false,
    permissions: overrides.permissions ?? [
      Permission.CHAT_USE,
      Permission.COMPARE_USE,
      Permission.JUDGE_USE,
    ],
    plan: {
      id: 'plan-1',
      slug: 'pro',
      name: 'Pro',
      featureGates: {
        allowCompareMode: true,
        allowJudgeMode: true,
        allowCriticReview: true,
        allowResearchMode: true,
        allowWorkspaces: true,
        allowMemory: true,
        allowContextPacks: true,
        ...overrides.featureGates,
      },
    },
    allowedModels: [],
    allowedProviders: [],
    quota: overrides.quota ?? {
      dailyLimit: 100_000,
      used: 0,
      remaining: 100_000,
      unlimited: false,
    },
  };
}

// Simulates the gate trio that runs inside chat-messages.service
// `assertCompareAccess` (line 306-338). Mirrors the exact feature-array and
// permission re-check sequence so the test exercises the production flow.
async function runCompareGate(
  service: AccessControlService,
  userId: string,
  opts: {
    judgeEnabled?: boolean;
    criticEnabled?: boolean;
    researchMode?: 'NONE' | 'SEARCH';
  } = {},
): Promise<void> {
  type PlanFeature =
    'allowCompareMode' | 'allowJudgeMode' | 'allowCriticReview' | 'allowResearchMode';
  const features: PlanFeature[] = ['allowCompareMode'];
  if (opts.judgeEnabled === true) {
    features.push('allowJudgeMode');
  }
  if (opts.criticEnabled === true) {
    features.push('allowCriticReview');
  }
  if (opts.researchMode !== undefined && opts.researchMode !== 'NONE') {
    features.push('allowResearchMode');
  }
  await service.assertCanSendMessage(userId, { requireFeature: features });
  await service.assertCanSendMessage(userId, { requirePermission: Permission.COMPARE_USE });
  if (opts.judgeEnabled === true) {
    await service.assertCanSendMessage(userId, { requirePermission: Permission.JUDGE_USE });
  }
  if (opts.researchMode !== undefined && opts.researchMode !== 'NONE') {
    await service.assertCanSendMessage(userId, { requirePermission: Permission.RESEARCH_USE });
  }
}

// The PAYG meter is injected now. These suites test the plan / quota / exposure
// gates, not credit, so a stub that reports "not metered" keeps every existing
// assertion about those gates unchanged.
const paygMeter = {
  reserve: jest.fn().mockResolvedValue({
    metered: false,
    maxOutputTokens: 4096,
    clamped: false,
    reservationId: null,
    heldMicroUsd: 0,
    availableAfterMicroUsd: 0,
    reason: 'NOT_PAYG',
  }),
  finalize: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
} as unknown as PaygMeter;

describe('Slice C — compare + judge + critic plan gates', () => {
  let access: AccessControlService;

  beforeEach(() => {
    jest.clearAllMocks();
    access = new AccessControlService(paygMeter);
  });

  describe('compare-mode plan gate (allowCompareMode)', () => {
    it('USER with allowCompareMode=false → parallel compare throws PLAN_FEATURE_DISABLED (403)', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({ featureGates: { allowCompareMode: false } }),
      );

      await expect(runCompareGate(access, 'u1')).rejects.toMatchObject({
        code: 'PLAN_FEATURE_DISABLED',
        status: 403,
      });
    });

    it('USER with allowCompareMode=true → compare gate succeeds', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({ featureGates: { allowCompareMode: true } }),
      );

      await expect(runCompareGate(access, 'u1')).resolves.toBeUndefined();
    });

    it('USER with no plan at all → still locked (PLAN_FEATURE_DISABLED)', async () => {
      const ent = makeEntitlements();
      (ent as { plan: unknown }).plan = null;
      getEntitlements.mockResolvedValue(ent);

      await expect(runCompareGate(access, 'u1')).rejects.toMatchObject({
        code: 'PLAN_FEATURE_DISABLED',
      });
    });
  });

  describe('judge-mode plan gate (allowJudgeMode)', () => {
    it('judgeEnabled=true + allowJudgeMode=false → PLAN_FEATURE_DISABLED (403)', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          featureGates: { allowCompareMode: true, allowJudgeMode: false },
        }),
      );

      await expect(runCompareGate(access, 'u1', { judgeEnabled: true })).rejects.toMatchObject({
        code: 'PLAN_FEATURE_DISABLED',
      });
    });

    it('judgeEnabled=true + allowJudgeMode=true → succeeds', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          featureGates: { allowCompareMode: true, allowJudgeMode: true },
        }),
      );

      await expect(runCompareGate(access, 'u1', { judgeEnabled: true })).resolves.toBeUndefined();
    });

    it('judgeEnabled=false still skips allowJudgeMode check entirely', async () => {
      // Even if the plan locks judge, a no-judge compare run goes through.
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          featureGates: { allowCompareMode: true, allowJudgeMode: false },
        }),
      );

      await expect(runCompareGate(access, 'u1', { judgeEnabled: false })).resolves.toBeUndefined();
    });
  });

  describe('critic plan gate (allowCriticReview)', () => {
    // At the service boundary (assertCompareAccess), criticEnabled=true with
    // allowCriticReview=false MUST be rejected so a curl/script bypass cannot
    // sneak the critic past the plan gate.
    it('criticEnabled=true + allowCriticReview=false → PLAN_FEATURE_DISABLED at boundary', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          featureGates: {
            allowCompareMode: true,
            allowJudgeMode: true,
            allowCriticReview: false,
          },
        }),
      );

      await expect(
        runCompareGate(access, 'u1', { judgeEnabled: true, criticEnabled: true }),
      ).rejects.toMatchObject({ code: 'PLAN_FEATURE_DISABLED' });
    });

    it('criticEnabled=true + allowCriticReview=true → boundary succeeds', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          featureGates: {
            allowCompareMode: true,
            allowJudgeMode: true,
            allowCriticReview: true,
          },
        }),
      );

      await expect(
        runCompareGate(access, 'u1', { judgeEnabled: true, criticEnabled: true }),
      ).resolves.toBeUndefined();
    });

    // Defense-in-depth — even if the boundary is bypassed somehow, the
    // JudgeRefereeManager re-asserts the critic gate inline. The
    // implementation chose to SKIP the critic on a rejection (the rejection
    // is caught by callCriticWithModel's try/catch and a parse-failure marker
    // is persisted in its place) — see judge-referee.manager.ts L243-260.
    it('JudgeRefereeManager defense-in-depth: critic call SKIPPED when allowCriticReview locks', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          featureGates: {
            allowCompareMode: true,
            allowJudgeMode: true,
            allowCriticReview: false,
          },
        }),
      );

      const callProvider = jest.fn().mockResolvedValueOnce({
        // Judge result — critic never made it to callProvider because
        // assertCanUseCritic threw before callProvider could fire.
        content: JSON.stringify({
          decision: 'ACCEPT',
          summary: 'OK',
          reasoning: 'Looks good',
          confidence: 0.9,
          responseType: 'verification_note',
          response: 'OK',
          recommendedChanges: [],
        }),
        provider: 'OLLAMA',
        model: 'gemma3:4b',
        latencyMs: 30,
        usedFallback: false,
      } as LlmResponse);
      const chatStream: Partial<Record<keyof ChatStreamService, jest.Mock>> = {
        emitJudgeEvaluating: jest.fn(),
        emitOrchestrationStage: jest.fn(),
      };
      const localSelection: Partial<Record<keyof LocalModelSelectionService, jest.Mock>> = {
        resolveDefaultModel: jest.fn().mockResolvedValue('gemma3:4b'),
      };

      const manager = new JudgeRefereeManager(
        chatStream as unknown as ChatStreamService,
        localSelection as unknown as LocalModelSelectionService,
        access,
      );
      manager.setExecutionManager({ callProvider } as unknown as ChatExecutionManager);

      const context: AssembledContext = {
        userId: 'u1',
        systemPrompt: null,
        threadMessages: [
          { role: 'USER', content: 'What is 2+2?' } as AssembledContext['threadMessages'][0],
        ],
        memories: [],
        contextPackItems: [],
        fileContents: [],
        workspaceCitations: [],
        researchEvidence: [],
        researchRunId: null,
        researchWarnings: [],
        tokenBudget: 4000,
        modelBudget: fallbackModelTokenBudget(),
        conversationManifest: emptyConversationManifest(),
        crossThread: disabledCrossThreadResult(),
      };
      const config: JudgeRefereeConfig = {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: true,
        criticModel: 'GEMINI:gemini-2.5-flash',
        userId: 'u1',
      };
      const payload: MessageRoutedData = {
        messageId: 'm1',
        threadId: 't1',
        selectedProvider: 'OPENAI',
        selectedModel: 'gpt-4o-mini',
        routingMode: 'MANUAL_MODEL',
        timestamp: new Date().toISOString(),
        judgeEnabled: true,
      };
      const originalResponse: LlmResponse = {
        content: '4',
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 100,
        usedFallback: false,
      };

      const result = await manager.evaluate(originalResponse, context, config, payload);

      // Critic was SKIPPED — only the judge call fired, the manager swallowed
      // the assertCanUseCritic rejection and persisted a parse-failure marker.
      expect(callProvider).toHaveBeenCalledTimes(1);
      expect(result.criticEvaluation.parseFailed).toBe(true);
      // The judge verdict still completed; the run did not throw to the user.
      expect(result.judgeVerdict.decision).toBe(JudgeDecision.ACCEPT);
    });

    it('JudgeRefereeManager: critic LLM is invoked when allowCriticReview unlocked', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          featureGates: {
            allowCompareMode: true,
            allowJudgeMode: true,
            allowCriticReview: true,
          },
        }),
      );

      const callProvider = jest
        .fn()
        // Critic call (cloud) — returns valid critic JSON
        .mockResolvedValueOnce({
          content: JSON.stringify({ feedback: [], score: 0.95 }),
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          latencyMs: 50,
          usedFallback: false,
        } as LlmResponse)
        // Judge call
        .mockResolvedValueOnce({
          content: JSON.stringify({
            decision: 'ACCEPT',
            summary: 'OK',
            reasoning: 'Looks good',
            confidence: 0.9,
            responseType: 'verification_note',
            response: 'OK',
            recommendedChanges: [],
          }),
          provider: 'OLLAMA',
          model: 'gemma3:4b',
          latencyMs: 30,
          usedFallback: false,
        } as LlmResponse);

      const chatStream: Partial<Record<keyof ChatStreamService, jest.Mock>> = {
        emitJudgeEvaluating: jest.fn(),
        emitOrchestrationStage: jest.fn(),
      };
      const localSelection: Partial<Record<keyof LocalModelSelectionService, jest.Mock>> = {
        resolveDefaultModel: jest.fn().mockResolvedValue('gemma3:4b'),
      };
      const manager = new JudgeRefereeManager(
        chatStream as unknown as ChatStreamService,
        localSelection as unknown as LocalModelSelectionService,
        access,
      );
      manager.setExecutionManager({ callProvider } as unknown as ChatExecutionManager);

      const context: AssembledContext = {
        userId: 'u1',
        systemPrompt: null,
        threadMessages: [
          { role: 'USER', content: 'What is 2+2?' } as AssembledContext['threadMessages'][0],
        ],
        memories: [],
        contextPackItems: [],
        fileContents: [],
        workspaceCitations: [],
        researchEvidence: [],
        researchRunId: null,
        researchWarnings: [],
        tokenBudget: 4000,
        modelBudget: fallbackModelTokenBudget(),
        conversationManifest: emptyConversationManifest(),
        crossThread: disabledCrossThreadResult(),
      };
      const config: JudgeRefereeConfig = {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: true,
        criticModel: 'GEMINI:gemini-2.5-flash',
        userId: 'u1',
      };
      const payload: MessageRoutedData = {
        messageId: 'm1',
        threadId: 't1',
        selectedProvider: 'OPENAI',
        selectedModel: 'gpt-4o-mini',
        routingMode: 'MANUAL_MODEL',
        timestamp: new Date().toISOString(),
        judgeEnabled: true,
      };
      const originalResponse: LlmResponse = {
        content: '4',
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 100,
        usedFallback: false,
      };

      const result = await manager.evaluate(originalResponse, context, config, payload);

      // Both critic + judge calls fired.
      expect(callProvider).toHaveBeenCalledTimes(2);
      expect(result.criticEvaluation.parseFailed).not.toBe(true);
      expect(result.criticEvaluation.requested).toBe(true);
      expect(result.judgeVerdict.decision).toBe(JudgeDecision.ACCEPT);
    });
  });

  describe('all features unlocked — happy path', () => {
    it('compare + judge + critic + research all true → every gate passes', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          permissions: [
            Permission.CHAT_USE,
            Permission.COMPARE_USE,
            Permission.JUDGE_USE,
            Permission.RESEARCH_USE,
          ],
          featureGates: {
            allowCompareMode: true,
            allowJudgeMode: true,
            allowCriticReview: true,
            allowResearchMode: true,
          },
        }),
      );

      await expect(
        runCompareGate(access, 'u1', {
          judgeEnabled: true,
          criticEnabled: true,
          researchMode: 'SEARCH',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('RBAC permission re-checks (defense-in-depth)', () => {
    it('missing COMPARE_USE → INSUFFICIENT_PERMISSIONS (403)', async () => {
      getEntitlements.mockResolvedValue(makeEntitlements({ permissions: [Permission.CHAT_USE] }));

      await expect(runCompareGate(access, 'u1')).rejects.toMatchObject({
        code: 'INSUFFICIENT_PERMISSIONS',
        status: 403,
      });
    });

    it('judgeEnabled=true but missing JUDGE_USE permission → INSUFFICIENT_PERMISSIONS', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({ permissions: [Permission.CHAT_USE, Permission.COMPARE_USE] }),
      );

      await expect(runCompareGate(access, 'u1', { judgeEnabled: true })).rejects.toMatchObject({
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    });
  });

  describe('ADMIN bypass', () => {
    it('ADMIN bypasses every plan-feature gate even when plan locks all 3', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          isAdmin: true,
          role: UserRole.ADMIN,
          permissions: [],
          featureGates: {
            allowCompareMode: false,
            allowJudgeMode: false,
            allowCriticReview: false,
            allowResearchMode: false,
          },
        }),
      );

      await expect(
        runCompareGate(access, 'u1', {
          judgeEnabled: true,
          criticEnabled: true,
          researchMode: 'SEARCH',
        }),
      ).resolves.toBeUndefined();
    });

    it('ADMIN bypass also clears the in-manager assertCanUseCritic gate', async () => {
      getEntitlements.mockResolvedValue(
        makeEntitlements({
          isAdmin: true,
          role: UserRole.ADMIN,
          featureGates: { allowCriticReview: false },
        }),
      );

      await expect(access.assertCanUseCritic('u1')).resolves.toBeUndefined();
    });
  });

  describe('entitlements outage', () => {
    it('compare-boundary fails closed when entitlements adapter is unreachable', async () => {
      getEntitlements.mockRejectedValue(new Error('auth down'));

      await expect(
        runCompareGate(access, 'u1', { judgeEnabled: true, criticEnabled: true }),
      ).rejects.toMatchObject({ code: 'ENTITLEMENTS_UNAVAILABLE', status: 503 });
    });
  });
});
