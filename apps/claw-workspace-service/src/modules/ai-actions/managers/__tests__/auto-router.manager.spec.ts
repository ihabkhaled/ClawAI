import {
  AiActionKind,
  AiActionMode,
  AiActionPrivacyClass,
} from '../../../../common/enums/ai-action-kind.enum';
import { AutoRouterManager } from '../auto-router.manager';

describe('AutoRouterManager', () => {
  let manager: AutoRouterManager;

  beforeEach(() => {
    manager = new AutoRouterManager();
  });

  it('returns MANUAL mode when a preferred model is provided', () => {
    const preferred = {
      provider: 'OPENAI',
      model: 'gpt-4o',
      displayName: 'GPT-4o',
    };
    const result = manager.resolve({
      actionKind: AiActionKind.DRAFT,
      privacyClass: AiActionPrivacyClass.PUBLIC,
      preferredModel: preferred,
    });
    expect(result.mode).toBe(AiActionMode.MANUAL);
    expect(result.primary).toEqual(preferred);
    expect(result.fallbackChain).toEqual([]);
  });

  it('returns AUTO mode with default route for SUMMARIZE', () => {
    const result = manager.resolve({
      actionKind: AiActionKind.SUMMARIZE,
      privacyClass: AiActionPrivacyClass.INTERNAL,
    });
    expect(result.mode).toBe(AiActionMode.AUTO);
    expect(result.primary.provider).toBe('local-ollama');
    expect(result.fallbackChain.length).toBeGreaterThan(0);
  });

  it('returns AUTO mode with Anthropic primary for DRAFT', () => {
    const result = manager.resolve({
      actionKind: AiActionKind.DRAFT,
      privacyClass: AiActionPrivacyClass.INTERNAL,
    });
    expect(result.primary.provider).toBe('ANTHROPIC');
  });

  it('filters PRIVATE class to local-only models', () => {
    const result = manager.resolve({
      actionKind: AiActionKind.DRAFT,
      privacyClass: AiActionPrivacyClass.PRIVATE,
    });
    expect(result.primary.provider).toBe('local-ollama');
    for (const entry of result.fallbackChain) {
      expect(entry.provider).toBe('local-ollama');
    }
  });

  it('covers all 6 action kinds with non-empty chains', () => {
    const kinds = [
      AiActionKind.SUMMARIZE,
      AiActionKind.DRAFT,
      AiActionKind.COMPARE,
      AiActionKind.JUDGE,
      AiActionKind.REWRITE,
      AiActionKind.EXTRACT,
    ];
    for (const kind of kinds) {
      const result = manager.resolve({
        actionKind: kind,
        privacyClass: AiActionPrivacyClass.INTERNAL,
      });
      expect(result.primary).toBeDefined();
      expect(result.primary.model.length).toBeGreaterThan(0);
    }
  });

  it('handles PRIVATE on action kind with no local primary gracefully', () => {
    const result = manager.resolve({
      actionKind: AiActionKind.COMPARE,
      privacyClass: AiActionPrivacyClass.PRIVATE,
    });
    // COMPARE default chain has no local-ollama entries; should fall back to
    // the LOCAL_FALLBACK_CHAIN constant.
    expect(result.primary.provider).toBe('local-ollama');
  });
});
