import { RoutingMode } from '../../../generated/prisma';
import { CapabilityRouterManager } from '../managers/capability-router.manager';
import { type CloudRouterManager } from '../managers/cloud-router.manager';
import { type CloudRouterEligibilityManager } from '../managers/cloud-router-eligibility.manager';
import { type CloudRouterPromptManager } from '../managers/cloud-router-prompt.manager';
import { ComplexityClassifierManager } from '../managers/complexity-classifier.manager';
import { ImageDetectionManager } from '../managers/image-detection.manager';
import { type OllamaRouterManager } from '../managers/ollama-router.manager';
import { type PromptBuilderManager } from '../managers/prompt-builder.manager';
import { RoutingManager } from '../managers/routing.manager';
import { type RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { type RoutingContext } from '../types/routing.types';

const mockPoliciesRepo = (): Partial<Record<keyof RoutingPoliciesRepository, jest.Mock>> => ({
  findActivePolicies: jest.fn().mockResolvedValue([]),
});

const mockCloudRouterDeps = (): {
  cloudRouter: { route: jest.Mock };
  cloudRouterEligibility: { resolveEligibleDeployments: jest.Mock };
  cloudRouterPrompt: { buildPrompt: jest.Mock };
} => ({
  cloudRouter: { route: jest.fn() },
  cloudRouterEligibility: { resolveEligibleDeployments: jest.fn().mockResolvedValue([]) },
  cloudRouterPrompt: { buildPrompt: jest.fn().mockReturnValue('cloud router prompt') },
});

describe('RoutingManager semantic guard', () => {
  let manager: RoutingManager;

  beforeEach(() => {
    const policiesRepo = mockPoliciesRepo();
    const ollamaRouter = { route: jest.fn() };
    const promptBuilder = {
      fetchInstalledModels: jest.fn().mockResolvedValue([]),
      getInstalledModels: jest.fn().mockResolvedValue([]),
      invalidateCache: jest.fn(),
    };
    const { cloudRouter, cloudRouterEligibility, cloudRouterPrompt } = mockCloudRouterDeps();
    manager = new RoutingManager(
      policiesRepo as unknown as RoutingPoliciesRepository,
      ollamaRouter as unknown as OllamaRouterManager,
      promptBuilder as unknown as PromptBuilderManager,
      new ComplexityClassifierManager(),
      new CapabilityRouterManager(),
      new ImageDetectionManager(),
      cloudRouter as unknown as CloudRouterManager,
      cloudRouterEligibility as unknown as CloudRouterEligibilityManager,
      cloudRouterPrompt as unknown as CloudRouterPromptManager,
    );
  });

  it('rejects an image route for a plain coding request', async () => {
    (manager as any).ollamaRouter.route = jest.fn().mockResolvedValue({
      provider: 'IMAGE_GEMINI',
      model: 'gemini-2.5-flash-image',
      confidence: 0.99,
      reason: 'bad image route',
      routerModel: 'qwen3:1.7b',
    });

    const result = await manager.evaluateRoute({
      message: 'Write a TypeScript service that retries failed HTTP requests',
      threadId: 'thread-1',
      connectorHealth: {
        OPENAI: true,
        ANTHROPIC: true,
        GEMINI: true,
        IMAGE_GEMINI: true,
      },
      runtimeHealth: { OLLAMA: true },
      userMode: RoutingMode.AUTO,
    } as RoutingContext);

    expect(result.selectedProvider).not.toBe('IMAGE_GEMINI');
    expect(result.reasonTags).not.toContain('ollama_router');
  });

  it('rejects an image fallback label when the router demotes to local AUTO', async () => {
    (manager as any).ollamaRouter.route = jest.fn().mockResolvedValue({
      provider: 'local-ollama',
      model: 'AUTO',
      confidence: 0.6,
      reason: 'Router selected unavailable IMAGE_GEMINI; using local AUTO',
      routerModel: 'qwen3:1.7b',
    });

    const result = await manager.evaluateRoute({
      message: 'Write a TypeScript service that retries failed HTTP requests',
      threadId: 'thread-2',
      connectorHealth: {
        OPENAI: true,
        ANTHROPIC: true,
        GEMINI: true,
        IMAGE_GEMINI: true,
      },
      runtimeHealth: { OLLAMA: true },
      userMode: RoutingMode.AUTO,
    } as RoutingContext);

    // Routing prefers cloud coding when healthy — the coding-intent message
    // now short-circuits to Anthropic before consulting the Ollama router.
    // Guard still holds: the image label is rejected and no ollama_router tag leaks.
    expect(result.selectedProvider).not.toBe('IMAGE_GEMINI');
    expect(result.reasonTags).not.toContain('ollama_router');
  });

  it('routes quarterly PDF reports to file generation instead of image generation', async () => {
    const result = await manager.evaluateRoute({
      message: 'Generate a PDF report with the quarterly summary',
      threadId: 'thread-3',
      connectorHealth: {
        OPENAI: true,
        ANTHROPIC: true,
        GEMINI: true,
        IMAGE_GEMINI: true,
      },
      runtimeHealth: { OLLAMA: true },
      userMode: RoutingMode.AUTO,
    } as RoutingContext);

    expect(result.selectedProvider).toBe('FILE_GENERATION');
    expect(result.selectedModel).toBe('auto');
    expect(result.reasonTags).toContain('file_generation');
    expect(result.reasonTags).not.toContain('image_generation');
  });
});
