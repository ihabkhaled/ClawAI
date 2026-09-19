import { vi } from 'vitest';
import { RouterProvider } from '../../../generated/prisma';
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

  it('returns an empty list when nothing qualifies, rather than throwing', async () => {
    const result = await build(EXPOSED, []).resolveEligibleDeployments(baseContext);

    expect(result).toEqual([]);
  });
});
