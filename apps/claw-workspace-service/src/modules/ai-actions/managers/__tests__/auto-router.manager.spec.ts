import {
  AiActionKind,
  AiActionMode,
  AiActionPrivacyClass,
} from '../../../../common/enums/ai-action-kind.enum';
import { AutoRouterManager } from '../auto-router.manager';
import type { ModelChoice } from '../../types/ai-action.types';

const localFast: ModelChoice = {
  provider: 'local-ollama',
  model: 'llama3.2:latest',
  displayName: 'llama3.2 (local)',
};
const cloudAnthropic: ModelChoice = {
  provider: 'ANTHROPIC',
  model: 'claude-sonnet-4-6',
  displayName: 'Claude Sonnet 4.6',
};

describe('AutoRouterManager', () => {
  const makeResolver = (
    primary: ModelChoice | null,
    fallbackChain: ModelChoice[] = [],
  ): { resolveDefaults: jest.Mock; invalidate: jest.Mock } => ({
    resolveDefaults: jest.fn().mockResolvedValue({ primary, fallbackChain }),
    invalidate: jest.fn(),
  });

  it('returns MANUAL mode when a preferred model is provided', async () => {
    const preferred = { provider: 'OPENAI', model: 'gpt-4o', displayName: 'GPT-4o' };

    const manager = new AutoRouterManager(makeResolver(localFast) as any);
    const result = await manager.resolve({
      actionKind: AiActionKind.DRAFT,
      privacyClass: AiActionPrivacyClass.PUBLIC,
      preferredModel: preferred,
    });
    expect(result.mode).toBe(AiActionMode.MANUAL);
    expect(result.primary).toEqual(preferred);
    expect(result.fallbackChain).toEqual([]);
  });

  it('returns AUTO mode using resolved primary when local is available', async () => {
    const manager = new AutoRouterManager(makeResolver(localFast, [cloudAnthropic]) as any);
    const result = await manager.resolve({
      actionKind: AiActionKind.SUMMARIZE,
      privacyClass: AiActionPrivacyClass.INTERNAL,
    });
    expect(result.mode).toBe(AiActionMode.AUTO);
    expect(result.primary.provider).toBe('local-ollama');
    expect(result.fallbackChain).toContainEqual(cloudAnthropic);
  });

  it('PRIVATE filters cloud entries from fallback chain', async () => {
    const manager = new AutoRouterManager(makeResolver(localFast, [cloudAnthropic]) as any);
    const result = await manager.resolve({
      actionKind: AiActionKind.DRAFT,
      privacyClass: AiActionPrivacyClass.PRIVATE,
    });
    expect(result.primary.provider).toBe('local-ollama');
    for (const entry of result.fallbackChain) {
      expect(entry.provider).toBe('local-ollama');
    }
  });

  it('PRIVATE refuses cloud-only chain (no local installed)', async () => {
    const manager = new AutoRouterManager(makeResolver(cloudAnthropic, []) as any);
    await expect(
      manager.resolve({
        actionKind: AiActionKind.DRAFT,
        privacyClass: AiActionPrivacyClass.PRIVATE,
      }),
    ).rejects.toThrow('privacy=PRIVATE requires an installed local model');
  });

  it('throws when neither local nor cloud is available', async () => {
    const manager = new AutoRouterManager(makeResolver(null, []) as any);
    await expect(
      manager.resolve({
        actionKind: AiActionKind.SUMMARIZE,
        privacyClass: AiActionPrivacyClass.INTERNAL,
      }),
    ).rejects.toThrow('no installed local model');
  });

  it('covers all 6 action kinds', async () => {
    const manager = new AutoRouterManager(makeResolver(localFast, [cloudAnthropic]) as any);
    const kinds = [
      AiActionKind.SUMMARIZE,
      AiActionKind.DRAFT,
      AiActionKind.COMPARE,
      AiActionKind.JUDGE,
      AiActionKind.REWRITE,
      AiActionKind.EXTRACT,
    ];
    for (const kind of kinds) {
      const result = await manager.resolve({
        actionKind: kind,
        privacyClass: AiActionPrivacyClass.INTERNAL,
      });
      expect(result.primary).toBeDefined();
      expect(result.primary.model.length).toBeGreaterThan(0);
    }
  });
});
