import { describe, expect, it, vi } from 'vitest';

import { PROMISE_JUDGE_BUDGET_MS } from '../../constants/search-continuation.constants';
import type { ResearchGateService } from '../../services/research-gate.service';
import type { LlmResponse } from '../../types/execution.types';
import { SearchContinuationManager } from '../search-continuation.manager';

const reply = (content: string, extra: Partial<LlmResponse> = {}): LlmResponse =>
  ({
    content,
    provider: 'OLLAMA_CLOUD',
    model: 'm',
    inputTokens: 1,
    outputTokens: 1,
    latencyMs: 1,
    usedFallback: false,
    ...extra,
  }) as LlmResponse;

function managerWith(verdict: unknown): {
  manager: SearchContinuationManager;
  ask: ReturnType<typeof vi.fn>;
} {
  const ask = vi.fn(async (_prompt: string, _tokens: number, parse: (raw: string) => unknown) =>
    verdict instanceof Error ? Promise.reject(verdict) : parse(JSON.stringify(verdict)),
  );
  const gate = { askPlanner: ask } as unknown as ResearchGateService;
  return { manager: new SearchContinuationManager(gate), ask };
}

describe('SearchContinuationManager.inspect', () => {
  it('trusts a web tool call without asking a model', async () => {
    const { manager, ask } = managerWith({ promisesSearch: false });
    const pending = await manager.inspect(
      reply('', { requestedTools: [{ name: 'web_search', argumentsText: '{"query":"x y"}' }] }),
      'q',
    );
    expect(pending).toEqual({ signal: 'tool-call', query: 'x y' });
    expect(ask).not.toHaveBeenCalled();
  });

  it('asks the judge about a short statement in any language', async () => {
    const { manager, ask } = managerWith({ promisesSearch: true, query: 'أغنية مسارح وسيما' });
    await expect(manager.inspect(reply('سأبحث لك الآن.'), 'مين غنى دي؟')).resolves.toEqual({
      signal: 'judge',
      query: 'أغنية مسارح وسيما',
    });
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('keeps a real answer the judge calls complete', async () => {
    const { manager } = managerWith({ promisesSearch: false, query: '' });
    await expect(
      manager.inspect(reply('Paris is the capital of France.'), 'q'),
    ).resolves.toBeNull();
  });

  it.each([
    ['a cited answer', reply('The price is 5 [1].')],
    ['a question back', reply('Which one do you mean?')],
    ['a long answer', reply('x '.repeat(600))],
    ['a stopped reply', reply('I will search', { finishReason: 'cancelled' })],
    ['an image turn', reply('I will search', { imageGenerationId: 'img' })],
    ['a plan notice', reply('I will search', { planFeatureRefusal: {} as never })],
  ])('never asks about %s', async (_name, response) => {
    const { manager, ask } = managerWith({ promisesSearch: true, query: 'x' });
    await expect(manager.inspect(response, 'q')).resolves.toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it('keeps the reply when the judge does not answer in time', async () => {
    vi.useFakeTimers();
    try {
      const ask = vi.fn(() => new Promise(() => {}));
      const manager = new SearchContinuationManager({
        askPlanner: ask,
      } as unknown as ResearchGateService);
      const pending = manager.inspect(reply('I will check that.'), 'q');
      await vi.advanceTimersByTimeAsync(PROMISE_JUDGE_BUDGET_MS);
      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the reply when the judge fails', async () => {
    const { manager } = managerWith(new Error('down'));
    await expect(manager.inspect(reply('I will check.'), 'q')).resolves.toBeNull();
  });
});
