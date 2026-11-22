import { type Mock, vi } from 'vitest';
import { RoutingMode } from '../../../generated/prisma';
import { CapabilityRouterManager } from '../managers/capability-router.manager';
import { type CloudRouterManager } from '../managers/cloud-router.manager';
import { type CloudRouterEligibilityManager } from '../managers/cloud-router-eligibility.manager';
import { type CloudRouterPromptManager } from '../managers/cloud-router-prompt.manager';
import { ComplexityClassifierManager } from '../managers/complexity-classifier.manager';
import { ImageDetectionManager } from '../managers/image-detection.manager';
import { type NamedModelRequestManager } from '../managers/named-model-request.manager';
import { type OllamaRouterManager } from '../managers/ollama-router.manager';
import { type PromptBuilderManager } from '../managers/prompt-builder.manager';
import { RoutingManager } from '../managers/routing.manager';
import { type TurnIntentManager } from '../managers/turn-intent.manager';
import { type RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { type RoutingContext } from '../types/routing.types';
import { type TurnIntentAnswer } from '../types/turn-intent.types';

const build = (classify: Mock): RoutingManager =>
  new RoutingManager(
    { findActivePolicies: vi.fn().mockResolvedValue([]) } as unknown as RoutingPoliciesRepository,
    { route: vi.fn().mockResolvedValue(null) } as unknown as OllamaRouterManager,
    {
      fetchInstalledModels: vi.fn().mockResolvedValue([]),
      getInstalledModels: vi.fn().mockResolvedValue([]),
      invalidateCache: vi.fn(),
    } as unknown as PromptBuilderManager,
    new ComplexityClassifierManager(),
    new CapabilityRouterManager(),
    new ImageDetectionManager(),
    { route: vi.fn() } as unknown as CloudRouterManager,
    {
      resolveEligibleDeployments: vi.fn().mockResolvedValue([]),
      rankDecisionByModalityFit: vi.fn((decision: unknown) => Promise.resolve(decision)),
    } as unknown as CloudRouterEligibilityManager,
    { buildPrompt: vi.fn().mockReturnValue('prompt') } as unknown as CloudRouterPromptManager,
    { resolve: vi.fn().mockResolvedValue(null) } as unknown as NamedModelRequestManager,
    { classify } as unknown as TurnIntentManager,
  );

const intent = (
  kind: TurnIntentAnswer['intent'],
  confidence = 0.9,
  fileFormat: string | null = null,
): TurnIntentAnswer => ({ intent: kind, fileFormat, confidence });

const base: RoutingContext = {
  message: 'Hello',
  threadId: 'thread-1',
  userId: 'user-1',
  userMode: RoutingMode.AUTO,
  connectorHealth: { OPENAI: true, ANTHROPIC: true, GEMINI: true },
  runtimeHealth: { OLLAMA: false },
};

/** Messages today's keyword detectors turn into a FILE job (proven by the null-intent case). */
const FILE_LOOKING_TEXT_TURNS = [
  'Create a txt file with this plan, actually no — regenerate please and combine your plan and this plan',
  "Export the users as a json file. Actually don't generate file, just answer me",
  'private static decryptVersionedQRCodeField(field: string): string { /* write to config.json file */ }',
];

describe('RoutingManager — model turn intent (ADR-218)', () => {
  describe('AUTO', () => {
    it.each(FILE_LOOKING_TEXT_TURNS)(
      'TEXT intent never becomes a FILE job: %s',
      async (message) => {
        const keywordOnly = await build(vi.fn().mockResolvedValue(null)).evaluateRoute({
          ...base,
          message,
        });
        expect(keywordOnly.selectedProvider).toBe('FILE_GENERATION');
        expect(keywordOnly.turnIntent).toMatchObject({ kind: 'FILE', source: 'HEURISTIC' });

        const result = await build(vi.fn().mockResolvedValue(intent('TEXT'))).evaluateRoute({
          ...base,
          message,
        });
        expect(result.selectedProvider).not.toBe('FILE_GENERATION');
        expect(result.selectedProvider.startsWith('IMAGE_')).toBe(false);
        expect(result.turnIntent).toEqual({ kind: 'TEXT', confidence: 0.9, source: 'MODEL' });
        expect(result.reasonTags).toContain('intent_model_text');
      },
    );

    it.each(['اكتب منشورا تسويقيا ثم ارسم لي صورة لقطة على الشاطئ', '海辺の猫の絵を描いて'])(
      'IMAGE_GENERATE intent in any language routes to an image provider: %s',
      async (message) => {
        const result = await build(
          vi.fn().mockResolvedValue(intent('IMAGE_GENERATE')),
        ).evaluateRoute({ ...base, message });
        expect(result.selectedProvider).toBe('IMAGE_GEMINI');
        expect(result.turnIntent?.kind).toBe('IMAGE_GENERATE');
        expect(result.reasonTags).toContain('intent_model_image_generate');
        expect(result.reasonTags).not.toContain('keyword_detected');
      },
    );

    it('FILE intent builds the file decision with the model reason tag and format', async () => {
      const result = await build(
        vi.fn().mockResolvedValue(intent('FILE', 0.88, 'pdf')),
      ).evaluateRoute({ ...base, message: 'حوّل هذه الخطة إلى مستند' });
      expect(result.selectedProvider).toBe('FILE_GENERATION');
      expect(result.reasonTags).toContain('file_intent_model');
      expect(result.turnIntent).toEqual({
        kind: 'FILE',
        fileFormat: 'pdf',
        confidence: 0.88,
        source: 'MODEL',
      });
    });

    it('asks the classifier once per request, with the turn facts', async () => {
      const classify = vi.fn().mockResolvedValue(intent('TEXT'));
      await build(classify).evaluateRoute({
        ...base,
        message: 'again please',
        previousTurnKind: 'IMAGE',
      });
      expect(classify).toHaveBeenCalledTimes(1);
      expect(classify).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'again please',
          userId: 'user-1',
          threadId: 'thread-1',
          previousTurnKind: 'IMAGE',
        }),
      );
    });

    it('null intent keeps the keyword path: an image request is a HEURISTIC image decision', async () => {
      const result = await build(vi.fn().mockResolvedValue(null)).evaluateRoute({
        ...base,
        message: 'generate an image of a cat on the beach',
      });
      expect(result.selectedProvider.startsWith('IMAGE_')).toBe(true);
      expect(result.turnIntent).toMatchObject({ kind: 'IMAGE_GENERATE', source: 'HEURISTIC' });
    });

    it('null intent with no generation keywords publishes no turn intent', async () => {
      const result = await build(vi.fn().mockResolvedValue(null)).evaluateRoute(base);
      expect(result.turnIntent).toBeUndefined();
    });
  });

  describe('MANUAL', () => {
    const kimi: RoutingContext = {
      ...base,
      userMode: RoutingMode.MANUAL_MODEL,
      forcedProvider: 'OLLAMA',
      forcedModel: 'kimi-k2:1t-cloud',
      message: 'Export the users as a json file please',
    };

    it('a picked chat model with a TEXT turn stays the pick, whatever the words', async () => {
      const keywordOnly = await build(vi.fn().mockResolvedValue(null)).evaluateRoute(kimi);
      expect(keywordOnly.selectedProvider).toBe('FILE_GENERATION');

      const result = await build(vi.fn().mockResolvedValue(intent('TEXT'))).evaluateRoute(kimi);
      expect(result.selectedProvider).toBe('OLLAMA');
      expect(result.selectedModel).toBe('kimi-k2:1t-cloud');
      expect(result.turnIntent?.kind).toBe('TEXT');
    });

    it('a picked chat model with a FILE turn keeps the redirect, with the pick as the writer', async () => {
      const result = await build(
        vi.fn().mockResolvedValue(intent('FILE', 0.9, 'json')),
      ).evaluateRoute(kimi);
      expect(result.selectedProvider).toBe('FILE_GENERATION');
      expect(result.fileWriter).toEqual({ provider: 'OLLAMA', model: 'kimi-k2:1t-cloud' });
    });

    const imagePick: RoutingContext = {
      ...base,
      userMode: RoutingMode.MANUAL_MODEL,
      forcedProvider: 'IMAGE_GEMINI',
      forcedModel: 'gemini-2.5-flash-image',
      message: 'Hi',
    };

    it('a generation-only pick on a sure TEXT turn is answered by a text model, and says so', async () => {
      const classify = vi.fn().mockResolvedValue(intent('TEXT', 0.92));
      const result = await build(classify).evaluateRoute(imagePick);
      expect(result.selectedProvider.startsWith('IMAGE_')).toBe(false);
      expect(result.turnIntent?.pickOverridden).toEqual({
        provider: 'IMAGE_GEMINI',
        model: 'gemini-2.5-flash-image',
      });
      expect(result.reasonTags).toContain('intent_pick_overridden');
      expect(classify).toHaveBeenCalledWith(expect.objectContaining({ pickedModelKind: 'IMAGE' }));
    });

    it('an unsure TEXT turn keeps the generation pick and publishes no contradicting intent', async () => {
      const result = await build(vi.fn().mockResolvedValue(intent('TEXT', 0.6))).evaluateRoute(
        imagePick,
      );
      expect(result.selectedProvider).toBe('IMAGE_GEMINI');
      expect(result.turnIntent).toBeUndefined();
    });

    it("null intent keeps today's behaviour for a generation pick", async () => {
      const result = await build(vi.fn().mockResolvedValue(null)).evaluateRoute(imagePick);
      expect(result.selectedProvider).toBe('IMAGE_GEMINI');
    });
  });

  it('LOCAL_ONLY never consults the classifier (its prompt would egress the message)', async () => {
    const classify = vi.fn().mockResolvedValue(intent('TEXT'));
    await build(classify).evaluateRoute({
      ...base,
      userMode: RoutingMode.LOCAL_ONLY,
      message: 'generate an image of a cat',
    });
    expect(classify).not.toHaveBeenCalled();
  });
});
