import { describe, expect, it, type Mock, vi } from 'vitest';
import { NamedModelCapability } from '../../../../common/enums/named-model-capability.enum';
import { NamedModelRequestManager } from '../named-model-request.manager';
import type { ModelDeploymentRepository } from '../../repositories/model-deployment.repository';
import type { RoutingContext } from '../../types/routing.types';

const ROWS = [
  { provider: 'GEMINI', providerModelId: 'models/gemini-2.5-flash', activationState: 'ACTIVE' },
  {
    provider: 'GEMINI',
    providerModelId: 'models/gemini-2.5-flash-image',
    activationState: 'ACTIVE',
  },
  { provider: 'GROK', providerModelId: 'grok-3-mini', activationState: 'ACTIVE' },
  {
    provider: 'GROK',
    providerModelId: 'grok-imagine-image',
    activationState: 'REQUIRES_VALIDATION',
  },
  { provider: 'OPENAI', providerModelId: 'gpt-4o-mini', activationState: 'ACTIVE' },
  { provider: 'OLLAMA', providerModelId: 'llama3.2:3b-instruct', activationState: 'ACTIVE' },
];

const build = (): { manager: NamedModelRequestManager; find: Mock } => {
  const find = vi.fn().mockResolvedValue(ROWS);
  const manager = new NamedModelRequestManager({
    findRoutableForCloudRouting: find,
  } as unknown as ModelDeploymentRepository);
  return { manager, find };
};

const ctx = (message: string, extra: Partial<RoutingContext> = {}): RoutingContext => ({
  message,
  connectorHealth: { GEMINI: true, GROK: true, OPENAI: true },
  ...extra,
});

describe('NamedModelRequestManager', () => {
  it('reads no catalog when the prompt has no directive word', async () => {
    const { manager, find } = build();
    await expect(manager.resolve(ctx('write a poem about spring'))).resolves.toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it('resolves "use nano banana to make X" to the catalog image model', async () => {
    const { manager } = build();
    await expect(
      manager.resolve(ctx('use nano banana to make a poster of a fox')),
    ).resolves.toEqual({
      resolution: {
        provider: 'GEMINI',
        model: 'models/gemini-2.5-flash-image',
        capability: NamedModelCapability.IMAGE,
        phrase: 'nano banana',
      },
      // What the image model receives: the task, without "use nano banana to".
      prompt: 'Make a poster of a fox',
      notice: null,
    });
  });

  it('"use grok to draw a cat" picks the Grok image model; "use grok" alone a chat model', async () => {
    const { manager } = build();
    await expect(manager.resolve(ctx('use grok to draw a cat'))).resolves.toMatchObject({
      resolution: {
        provider: 'GROK',
        model: 'grok-imagine-image',
        capability: NamedModelCapability.IMAGE,
      },
      prompt: 'Draw a cat',
    });
    await expect(manager.resolve(ctx('use grok to explain recursion'))).resolves.toMatchObject({
      resolution: {
        provider: 'GROK',
        model: 'grok-3-mini',
        capability: NamedModelCapability.CHAT,
      },
      prompt: 'Explain recursion',
    });
  });

  it('a provider known to be down is skipped and the notice says why', async () => {
    const { manager } = build();
    await expect(
      manager.resolve(
        ctx('use nano banana to make a poster', { connectorHealth: { GEMINI: false, GROK: true } }),
      ),
    ).resolves.toEqual({
      resolution: null,
      prompt: null,
      notice: { phrase: 'nano banana', provider: 'GEMINI', reason: 'CONNECTOR_DOWN' },
    });
  });

  it('"use grok" with no Grok model set up says NOT_CONFIGURED, never a silent fallback', async () => {
    const { manager, find } = build();
    find.mockResolvedValue(ROWS.filter((row) => row.provider !== 'GROK'));
    await expect(manager.resolve(ctx('use grok to explain recursion'))).resolves.toEqual({
      resolution: null,
      prompt: null,
      notice: { phrase: 'grok', provider: 'GROK', reason: 'NOT_CONFIGURED' },
    });
  });

  it('"use grok" when the plan has no Grok model says NOT_IN_PLAN', async () => {
    const { manager } = build();
    await expect(
      manager.resolve(
        ctx('use grok to explain recursion', {
          allowedModels: ['OPENAI/gpt-4o-mini'],
          modelAccessAllowAll: false,
        }),
      ),
    ).resolves.toMatchObject({
      resolution: null,
      notice: { provider: 'GROK', reason: 'NOT_IN_PLAN' },
    });
  });

  it('"use grok" for a picture when it has only chat models says NO_FITTING_MODEL', async () => {
    const { manager, find } = build();
    find.mockResolvedValue(ROWS.filter((row) => row.providerModelId !== 'grok-imagine-image'));
    await expect(manager.resolve(ctx('use grok to draw a cat'))).resolves.toMatchObject({
      resolution: null,
      notice: { provider: 'GROK', reason: 'NO_FITTING_MODEL' },
    });
  });

  it('skips a model the user plan does not allow (normal routing carries on)', async () => {
    const { manager } = build();
    const restricted = ctx('use nano banana to make a poster', {
      allowedModels: ['OPENAI/gpt-4o-mini', 'GEMINI/gemini-2.5-flash'],
      modelAccessAllowAll: false,
    });
    await expect(manager.resolve(restricted)).resolves.toMatchObject({
      resolution: null,
      notice: { reason: 'NOT_IN_PLAN' },
    });
    await expect(
      manager.resolve({ ...restricted, allowedModels: ['GEMINI/gemini-2.5-flash-image'] }),
    ).resolves.toMatchObject({ resolution: { provider: 'GEMINI' } });
    await expect(
      manager.resolve({ ...restricted, modelAccessAllowAll: true }),
    ).resolves.toMatchObject({
      resolution: { provider: 'GEMINI' },
    });
  });

  it('never routes a name to a local runtime provider', async () => {
    const { manager } = build();
    await expect(manager.resolve(ctx('use llama3.2 3b instruct to summarise'))).resolves.toBeNull();
  });

  it('returns null, never throws, when the catalog cannot be read', async () => {
    const { manager, find } = build();
    find.mockRejectedValue(new Error('db down'));
    await expect(manager.resolve(ctx('use grok to explain recursion'))).resolves.toBeNull();
  });

  it('a comparison names no model', async () => {
    const { manager } = build();
    await expect(manager.resolve(ctx('compare gemini with grok for coding'))).resolves.toBeNull();
  });
});
