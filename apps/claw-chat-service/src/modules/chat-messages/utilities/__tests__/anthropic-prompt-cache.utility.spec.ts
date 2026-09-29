import { applyAnthropicPromptCache } from '../anthropic-prompt-cache.utility';
import type { AnthropicMessagesRequest } from '../../types/execution.types';
import { ANTHROPIC_MAX_CACHE_BREAKPOINTS } from '../../constants/anthropic-prompt-cache.constants';

function baseRequest(overrides: Partial<AnthropicMessagesRequest> = {}): AnthropicMessagesRequest {
  return {
    model: 'claude-sonnet-5',
    messages: [{ role: 'user', content: 'hello' }],
    stream: false,
    ...overrides,
  };
}

function countBreakpoints(request: AnthropicMessagesRequest): number {
  const top = request.cache_control === undefined ? 0 : 1;
  const system = Array.isArray(request.system)
    ? request.system.filter((block) => block.cache_control !== undefined).length
    : 0;
  return top + system;
}

describe('applyAnthropicPromptCache', () => {
  it('adds the automatic top-level breakpoint so turn N reads turns 1..N-1', () => {
    const result = applyAnthropicPromptCache(baseRequest());
    expect(result.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('turns a string system prompt into one marked text block', () => {
    const result = applyAnthropicPromptCache(baseRequest({ system: 'You are ClawAI.' }));
    expect(result.system).toEqual([
      { type: 'text', text: 'You are ClawAI.', cache_control: { type: 'ephemeral' } },
    ]);
  });

  it('marks only the LAST system block when the system is already in block form', () => {
    const result = applyAnthropicPromptCache(
      baseRequest({
        system: [
          { type: 'text', text: 'first' },
          { type: 'text', text: 'second' },
        ],
      }),
    );
    expect(result.system).toEqual([
      { type: 'text', text: 'first' },
      { type: 'text', text: 'second', cache_control: { type: 'ephemeral' } },
    ]);
  });

  it('drops an empty system rather than sending a breakpoint on nothing (a 400)', () => {
    const result = applyAnthropicPromptCache(baseRequest({ system: '' }));
    expect(result.system).toBeUndefined();
    expect('system' in result).toBe(false);
  });

  it('leaves system absent when there was none', () => {
    const result = applyAnthropicPromptCache(baseRequest());
    expect('system' in result).toBe(false);
  });

  it('never mutates its input', () => {
    const input = baseRequest({ system: [{ type: 'text', text: 'keep me' }] });
    const snapshot = JSON.parse(JSON.stringify(input)) as AnthropicMessagesRequest;
    applyAnthropicPromptCache(input);
    expect(input).toEqual(snapshot);
  });

  it('keeps every other field verbatim', () => {
    const input = baseRequest({ temperature: 0.2, max_tokens: 1000, speed: 'fast' });
    const result = applyAnthropicPromptCache(input);
    expect(result.temperature).toBe(0.2);
    expect(result.max_tokens).toBe(1000);
    expect(result.speed).toBe('fast');
    expect(result.messages).toBe(input.messages);
  });

  it('stays inside the four-breakpoint budget', () => {
    const result = applyAnthropicPromptCache(
      baseRequest({
        system: [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
        ],
      }),
    );
    expect(countBreakpoints(result)).toBeLessThanOrEqual(ANTHROPIC_MAX_CACHE_BREAKPOINTS);
    expect(countBreakpoints(result)).toBe(2);
  });
});
