import { vi } from 'vitest';
import { RequiredModality } from '@claw/shared-types';
import { ModalityFit } from '../../../common/enums/modality-fit.enum';
import { ModalityKind, RouterProvider } from '../../../generated/prisma';
import { CloudRouterEligibilityManager } from '../managers/cloud-router-eligibility.manager';
import { type RoutingContext } from '../types/routing.types';

const baseContext: RoutingContext = { message: 'hello', threadId: 'thread-1' };

const row = (
  id: string,
  provider: RouterProvider,
  model: string,
  state = 'REQUIRES_VALIDATION',
) => ({
  id,
  provider,
  providerModelId: model,
  activationState: state,
});

// Production on 2026-09-19: 3 Gemini models ACTIVE, everything else awaiting
// validation, and admins had exposed Anthropic, OpenAI and Ollama models too.
const ROUTABLE = [
  row('g1', RouterProvider.GEMINI, 'models/gemini-3.6-flash', 'ACTIVE'),
  row('g2', RouterProvider.GEMINI, 'models/gemini-2.5-flash-lite', 'ACTIVE'),
  row('a1', RouterProvider.ANTHROPIC, 'claude-sonnet-5'),
  row('o1', RouterProvider.OPENAI, 'gpt-5.5'),
  row('o2', RouterProvider.OPENAI, 'gpt-4o-mini-tts'),
  row('l1', RouterProvider.OLLAMA, 'glm-5.2'),
];

const EXPOSED = new Set([
  'GEMINI/gemini-3.6-flash',
  'GEMINI/gemini-2.5-flash-lite',
  'ANTHROPIC/claude-sonnet-5',
  'OPENAI/gpt-5.5',
  'OLLAMA/glm-5.2',
]);

const build = (exposed: ReadonlySet<string> | null, routable = ROUTABLE) =>
  new CloudRouterEligibilityManager(
    {
      findRoutableForCloudRouting: vi.fn().mockResolvedValue(routable),
    } as never,
    { exposedChatModels: vi.fn().mockResolvedValue(exposed) } as never,
  );

const providers = (list: Array<{ provider: string }>) =>
  [...new Set(list.map((d) => d.provider))].sort();

describe('CloudRouterEligibilityManager.resolveEligibleDeployments', () => {
  it('offers every provider an admin exposed a model for, not only the ACTIVE Gemini ones', async () => {
    const result = await build(EXPOSED).resolveEligibleDeployments(baseContext);

    expect(providers(result)).toEqual(['ANTHROPIC', 'GEMINI', 'OLLAMA', 'OPENAI']);
  });

  it('never offers a model the admin did not expose', async () => {
    const result = await build(EXPOSED).resolveEligibleDeployments(baseContext);

    expect(result.map((d) => d.id)).not.toContain('o2');
  });

  it('keeps only the models the user plan allows', async () => {
    const result = await build(EXPOSED).resolveEligibleDeployments({
      ...baseContext,
      allowedModels: ['ANTHROPIC/claude-sonnet-5', 'GEMINI/models/gemini-3.6-flash'],
      modelAccessAllowAll: false,
    });

    expect(result.map((d) => d.id).sort()).toEqual(['a1', 'g1']);
  });

  it('ignores the plan list for an ALLOW_ALL plan', async () => {
    const result = await build(EXPOSED).resolveEligibleDeployments({
      ...baseContext,
      allowedModels: [],
      modelAccessAllowAll: true,
    });

    expect(result).toHaveLength(5);
  });

  it('offers nothing to a restricted plan with an empty list', async () => {
    const result = await build(EXPOSED).resolveEligibleDeployments({
      ...baseContext,
      allowedModels: [],
      modelAccessAllowAll: false,
    });

    expect(result).toEqual([]);
  });

  it('drops a provider whose connector is unhealthy', async () => {
    const result = await build(EXPOSED).resolveEligibleDeployments({
      ...baseContext,
      connectorHealth: { OPENAI: false },
    });

    expect(providers(result)).not.toContain('OPENAI');
  });

  it('falls back to ACTIVE-only when connector-service cannot be read', async () => {
    const result = await build(null).resolveEligibleDeployments(baseContext);

    expect(result.map((d) => d.id).sort()).toEqual(['g1', 'g2']);
  });

  // Multimodal batch 8: the context's attachment needs reach the ranking.
  it('ranks by the attachment modalities chat-service sent', async () => {
    const withModalities = [
      {
        ...row('o1', RouterProvider.OPENAI, 'gpt-5.5', 'ACTIVE'),
        modalitiesIn: [ModalityKind.TEXT],
      },
      {
        ...row('g1', RouterProvider.GEMINI, 'models/gemini-3.6-flash'),
        modalitiesIn: [ModalityKind.TEXT, ModalityKind.VIDEO_INPUT],
      },
    ];
    const result = await build(EXPOSED, withModalities).resolveEligibleDeployments({
      ...baseContext,
      attachmentMimeTypes: ['video/mp4'],
      requiredModalities: [RequiredModality.VIDEO_INPUT],
      transformableModalities: [RequiredModality.VIDEO_INPUT],
    });

    expect(result.map((d) => [d.id, d.modalityFit])).toEqual([
      ['g1', ModalityFit.DIRECT],
      ['o1', ModalityFit.TRANSFORMED],
    ]);
  });

  it('returns an empty list when nothing qualifies, rather than throwing', async () => {
    const result = await build(EXPOSED, []).resolveEligibleDeployments(baseContext);

    expect(result).toEqual([]);
  });
});

describe('CloudRouterEligibilityManager free plan price limit (ADR-162)', () => {
  // Output prices, micro-USD per million tokens.
  const PRICES: Record<string, number> = {
    'models/gemini-3.6-flash': 2_500_000,
    'models/gemini-2.5-flash-lite': 400_000,
    'claude-sonnet-5': 15_000_000,
    'gpt-5.5': 30_000_000,
    'glm-5.2': 0,
  };
  const buildPriced = (exposed: ReadonlySet<string> | null) =>
    new CloudRouterEligibilityManager(
      { findRoutableForCloudRouting: vi.fn().mockResolvedValue(ROUTABLE) } as never,
      { exposedChatModels: vi.fn().mockResolvedValue(exposed) } as never,
      {
        buildChecker: vi.fn(
          async (cap: number | null | undefined) => (_provider: string, model: string) =>
            typeof cap === 'number' && (PRICES[model] ?? 0) > cap,
        ),
      } as never,
    );

  it('leaves out models above the limit, and offers the cheap and included ones', async () => {
    const result = await buildPriced(EXPOSED).resolveEligibleDeployments({
      ...baseContext,
      freeModelPriceCap: 5_000_000,
    });

    expect(result.map((d) => d.id).sort()).toEqual(['g1', 'g2', 'l1']);
  });

  it('offers everything exposed when the plan has no limit', async () => {
    const result = await buildPriced(EXPOSED).resolveEligibleDeployments(baseContext);

    expect(providers(result)).toEqual(['ANTHROPIC', 'GEMINI', 'OLLAMA', 'OPENAI']);
  });

  it('is exactly the old behaviour when no price service is wired in', async () => {
    const result = await build(EXPOSED).resolveEligibleDeployments({
      ...baseContext,
      freeModelPriceCap: 1,
    });

    expect(providers(result)).toEqual(['ANTHROPIC', 'GEMINI', 'OLLAMA', 'OPENAI']);
  });

  it('combines with the plan allow-list: a model must pass both', async () => {
    const result = await buildPriced(EXPOSED).resolveEligibleDeployments({
      ...baseContext,
      allowedModels: ['GEMINI/models/gemini-3.6-flash', 'ANTHROPIC/claude-sonnet-5'],
      modelAccessAllowAll: false,
      freeModelPriceCap: 5_000_000,
    });

    expect(result.map((d) => d.id)).toEqual(['g1']);
  });
});

describe('CloudRouterEligibilityManager.rankDecisionByModalityFit', () => {
  const vision = {
    ...row('g1', RouterProvider.GEMINI, 'models/gemini-3.6-flash', 'ACTIVE'),
    modalitiesIn: [ModalityKind.TEXT, ModalityKind.IMAGE_INPUT],
  };
  const textOnly = {
    ...row('l1', RouterProvider.OLLAMA, 'glm-5.2'),
    modalitiesIn: [ModalityKind.TEXT],
  };
  const decision = {
    selectedProvider: 'local-ollama',
    selectedModel: 'glm-5.2',
    routingMode: 'AUTO',
    confidence: 0.8,
    reasonTags: ['auto', 'ollama_router'],
    privacyClass: 'local',
    costClass: 'free',
    fallbackChain: [{ provider: 'GEMINI', model: 'models/gemini-3.6-flash' }],
  } as never;
  const imageTurn: RoutingContext = {
    ...baseContext,
    requiredModalities: [RequiredModality.IMAGE_INPUT],
    transformableModalities: [RequiredModality.IMAGE_INPUT],
  };

  it('moves a capable fallback ahead of a local model that cannot see the image, keeping both', async () => {
    const result = await build(EXPOSED, [vision, textOnly]).rankDecisionByModalityFit(
      decision,
      imageTurn,
    );

    expect(result.selectedProvider).toBe('GEMINI');
    expect(result.fallbackChain).toEqual([{ provider: 'local-ollama', model: 'glm-5.2' }]);
    expect(result.reasonTags).toEqual(
      expect.arrayContaining(['modalityFit:direct', 'modality_fit_reranked']),
    );
  });

  it('returns the decision untouched and reads nothing when the turn has no attachments', async () => {
    const find = vi.fn();
    const manager = new CloudRouterEligibilityManager(
      { findRoutableForCloudRouting: find } as never,
      { exposedChatModels: vi.fn() } as never,
    );

    expect(await manager.rankDecisionByModalityFit(decision, baseContext)).toBe(decision);
    expect(find).not.toHaveBeenCalled();
  });
});
