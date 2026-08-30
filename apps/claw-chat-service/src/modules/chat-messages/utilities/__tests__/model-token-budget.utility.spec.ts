import {
  CONSERVATIVE_CONTEXT_WINDOW_TOKENS,
  MAX_HISTORY_INPUT_TOKENS,
  MIN_RESERVED_OUTPUT_TOKENS,
  PROVIDER_DEFAULT_CONTEXT_WINDOW_TOKENS,
} from '../../constants/context-composer.constants';
import { resolveModelTokenBudget } from '../model-token-budget.utility';

describe('resolveModelTokenBudget', () => {
  const base = {
    provider: 'OLLAMA',
    systemOverheadTokens: 0,
    toolOverheadTokens: 0,
  };

  it('does not let the requested OUTPUT length shrink the INPUT budget', () => {
    // The defect this whole type exists for: `maxTokens` (an answer length,
    // default 4096) was the size of the entire prompt, so a 256k model was
    // handed ~16k characters of history, memories, files and system prompt
    // combined.
    const short = resolveModelTokenBudget({
      ...base,
      contextWindowTokens: 256_000,
      requestedOutputTokens: 512,
    });
    const long = resolveModelTokenBudget({
      ...base,
      contextWindowTokens: 256_000,
      requestedOutputTokens: 8192,
    });

    expect(short.availableInputTokens).toBeGreaterThan(50_000);
    expect(long.availableInputTokens).toBeGreaterThan(50_000);
    expect(short.availableInputTokens).toBeGreaterThanOrEqual(long.availableInputTokens);
  });

  it('reserves the requested output tokens and spends the rest on input', () => {
    const budget = resolveModelTokenBudget({
      ...base,
      contextWindowTokens: 32_000,
      requestedOutputTokens: 4096,
    });

    expect(budget.reservedOutputTokens).toBe(4096);
    expect(budget.availableInputTokens).toBe(32_000 - 4096);
    expect(budget.source).toBe('MODEL_CATALOG');
  });

  it('subtracts measured system overhead from the input budget', () => {
    const budget = resolveModelTokenBudget({
      ...base,
      contextWindowTokens: 32_000,
      requestedOutputTokens: 4096,
      systemOverheadTokens: 5000,
      toolOverheadTokens: 1000,
    });

    expect(budget.availableInputTokens).toBe(32_000 - 4096 - 5000 - 1000);
  });

  it('caps history spend even on a million-token window', () => {
    const budget = resolveModelTokenBudget({
      ...base,
      contextWindowTokens: 1_000_000,
      requestedOutputTokens: 4096,
    });

    expect(budget.contextWindowTokens).toBe(1_000_000);
    expect(budget.availableInputTokens).toBe(MAX_HISTORY_INPUT_TOKENS);
  });

  it('falls back by provider when the catalog row is unenriched', () => {
    const budget = resolveModelTokenBudget({
      ...base,
      contextWindowTokens: null,
      requestedOutputTokens: 4096,
    });

    expect(budget.contextWindowTokens).toBe(PROVIDER_DEFAULT_CONTEXT_WINDOW_TOKENS);
    expect(budget.source).toBe('PROVIDER_DEFAULT');
  });

  it('falls back conservatively when nothing at all is known', () => {
    const budget = resolveModelTokenBudget({
      contextWindowTokens: null,
      provider: null,
      requestedOutputTokens: null,
      systemOverheadTokens: 0,
      toolOverheadTokens: 0,
    });

    expect(budget.contextWindowTokens).toBe(CONSERVATIVE_CONTEXT_WINDOW_TOKENS);
    expect(budget.source).toBe('CONSERVATIVE_FALLBACK');
    expect(budget.availableInputTokens).toBeGreaterThan(0);
  });

  it('never reports a negative input budget when overhead swamps the window', () => {
    const budget = resolveModelTokenBudget({
      ...base,
      contextWindowTokens: 8192,
      requestedOutputTokens: 4096,
      systemOverheadTokens: 100_000,
    });

    expect(budget.availableInputTokens).toBe(0);
  });

  it('clamps an absurd requested output length below the window', () => {
    const budget = resolveModelTokenBudget({
      ...base,
      contextWindowTokens: 8192,
      requestedOutputTokens: 999_999,
    });

    expect(budget.reservedOutputTokens).toBeLessThanOrEqual(8192 / 2);
    expect(budget.reservedOutputTokens).toBeGreaterThanOrEqual(MIN_RESERVED_OUTPUT_TOKENS);
  });
});
