import { type Mock, vi } from 'vitest';
import { RoutingMode } from '../../../generated/prisma';
import { CapabilityRouterManager } from '../managers/capability-router.manager';
import { ComplexityClassifierManager } from '../managers/complexity-classifier.manager';
import { ImageDetectionManager } from '../managers/image-detection.manager';
import { RoutingManager } from '../managers/routing.manager';
import { type RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { type RoutingContext } from '../types/routing.types';

const mockPoliciesRepo = (): Partial<Record<keyof RoutingPoliciesRepository, Mock>> => ({
  findActivePolicies: vi.fn().mockResolvedValue([]),
});

const mockCloudRouterDeps = (): {
  cloudRouter: { route: Mock };
  cloudRouterEligibility: { resolveEligibleDeployments: Mock };
  cloudRouterPrompt: { buildPrompt: Mock };
} => ({
  cloudRouter: { route: vi.fn() },
  cloudRouterEligibility: { resolveEligibleDeployments: vi.fn().mockResolvedValue([]) },
  cloudRouterPrompt: { buildPrompt: vi.fn().mockReturnValue('cloud router prompt') },
});

describe('RoutingManager image edit intent', () => {
  let manager: RoutingManager;

  beforeEach(() => {
    const policiesRepo = mockPoliciesRepo();
    const ollamaRouter = { route: vi.fn() };
    const promptBuilder = {
      fetchInstalledModels: vi.fn().mockResolvedValue([]),
      getInstalledModels: vi.fn().mockResolvedValue([]),
      invalidateCache: vi.fn(),
    };
    const { cloudRouter, cloudRouterEligibility, cloudRouterPrompt } = mockCloudRouterDeps();
    manager = new RoutingManager(
      policiesRepo as never,
      ollamaRouter as never,
      promptBuilder as never,
      new ComplexityClassifierManager(),
      new CapabilityRouterManager(),
      new ImageDetectionManager(),
      cloudRouter as never,
      cloudRouterEligibility as never,
      cloudRouterPrompt as never,
    );
  });

  const ctx = (overrides: Partial<RoutingContext>): RoutingContext =>
    ({
      threadId: 'thread-1',
      connectorHealth: { OPENAI: true, GEMINI: true },
      runtimeHealth: { OLLAMA: true },
      userMode: RoutingMode.AUTO,
      ...overrides,
    }) as RoutingContext;

  it('routes "remove the background" with an attached image to an edit-capable provider', async () => {
    const result = await manager.evaluateRoute(
      ctx({ message: 'remove the background', attachmentMimeTypes: ['image/png'] }),
    );
    expect(result.selectedProvider).toBe('IMAGE_GEMINI');
    expect(result.reasonTags).toContain('image_edit');
    expect(result.fallbackChain.map((e) => e.provider)).not.toContain('IMAGE_GROK');
  });

  it('prefers the next healthy edit provider when Gemini is down', async () => {
    const result = await manager.evaluateRoute(
      ctx({
        message: 'make it blue',
        attachmentMimeTypes: ['image/jpeg'],
        connectorHealth: { OPENAI: true, GEMINI: false },
      }),
    );
    expect(result.selectedProvider).toBe('IMAGE_OPENAI');
    expect(result.selectedModel).toBe('gpt-image-1');
  });

  it('does not make "what is this?" with an image an image job', async () => {
    const result = await manager.evaluateRoute(
      ctx({ message: 'what is this?', attachmentMimeTypes: ['image/png'] }),
    );
    expect(result.selectedProvider.startsWith('IMAGE_')).toBe(false);
  });

  it('keeps "draw a cat" with no attachment as generation', async () => {
    const result = await manager.evaluateRoute(ctx({ message: 'draw a cat' }));
    expect(result.selectedProvider).toBe('IMAGE_GEMINI');
    expect(result.reasonTags).toContain('image_generation');
  });

  it('moves a picked Grok image model to an edit provider for an edit', async () => {
    const result = await manager.evaluateRoute(
      ctx({
        message: 'add a hat',
        attachmentMimeTypes: ['image/png'],
        userMode: RoutingMode.MANUAL_MODEL,
        forcedProvider: 'GROK',
        forcedModel: 'grok-imagine-image',
      }),
    );
    expect(result.selectedProvider).toBe('IMAGE_GEMINI');
  });

  it('keeps a picked edit-capable image model for an edit', async () => {
    const result = await manager.evaluateRoute(
      ctx({
        message: 'add a hat',
        attachmentMimeTypes: ['image/png'],
        userMode: RoutingMode.MANUAL_MODEL,
        forcedProvider: 'OPENAI',
        forcedModel: 'gpt-image-1',
      }),
    );
    expect(result.selectedProvider).toBe('IMAGE_OPENAI');
    expect(result.selectedModel).toBe('gpt-image-1');
  });

  it('keeps a picked Grok image model for a plain generation (rule 51 item 17)', async () => {
    const result = await manager.evaluateRoute(
      ctx({
        message: 'draw a cat',
        userMode: RoutingMode.MANUAL_MODEL,
        forcedProvider: 'GROK',
        forcedModel: 'grok-imagine-image',
      }),
    );
    expect(result.selectedProvider).toBe('IMAGE_GROK');
  });
});
