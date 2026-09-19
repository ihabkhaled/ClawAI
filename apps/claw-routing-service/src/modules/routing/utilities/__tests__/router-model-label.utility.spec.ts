import { describe, expect, it } from 'vitest';

import { RouterProvider } from '../../../../generated/prisma';
import { routerModelFromAttempts } from '../router-model-label.utility';

const attempt = (provider: RouterProvider, model: string, outcome: 'SUCCESS' | 'FAILURE') => ({
  entryId: 'e',
  order: 1,
  attemptNumber: 1,
  provider,
  providerModelId: model,
  deploymentId: 'd',
  outcome,
  code: null,
  safeMessage: null,
  latencyMs: 10,
  wasRepair: false,
});

describe('routerModelFromAttempts', () => {
  // Production 2026-09-19: gpt-oss:120b routed, gpt-5.1 answered, and the UI
  // could only name the answerer.
  it('names the chain model whose decision was used', () => {
    expect(
      routerModelFromAttempts([attempt(RouterProvider.OLLAMA_CLOUD, 'gpt-oss:120b', 'SUCCESS')]),
    ).toBe('OLLAMA_CLOUD/gpt-oss:120b');
  });

  it('skips failed attempts and names the fallback that succeeded', () => {
    expect(
      routerModelFromAttempts([
        attempt(RouterProvider.OLLAMA_CLOUD, 'gemma4:31b', 'FAILURE'),
        attempt(RouterProvider.OLLAMA_CLOUD, 'gpt-oss:20b', 'SUCCESS'),
      ]),
    ).toBe('OLLAMA_CLOUD/gpt-oss:20b');
  });

  it('is null when no attempt succeeded', () => {
    expect(routerModelFromAttempts([attempt(RouterProvider.GEMINI, 'x', 'FAILURE')])).toBeNull();
  });
});
