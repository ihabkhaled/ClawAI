import {
  CONSERVATIVE_CONTEXT_WINDOW_TOKENS,
  DEFAULT_OUTPUT_RESERVE_RATIO,
  MAX_HISTORY_INPUT_TOKENS,
  MAX_RESERVED_OUTPUT_TOKENS,
  MIN_RESERVED_OUTPUT_TOKENS,
  PROVIDER_DEFAULT_CONTEXT_WINDOW_TOKENS,
} from '../constants/context-composer.constants';
import { type ModelTokenBudget, type ModelTokenBudgetInput } from '../types/context-composer.types';

/**
 * Providers whose models are large enough that an unpopulated catalog row is a
 * gap in the catalog rather than evidence of a small window. Used only to pick
 * a better fallback than the conservative one, never to override a real value.
 */
const LARGE_WINDOW_PROVIDERS: ReadonlySet<string> = new Set([
  'OLLAMA',
  'ANTHROPIC',
  'OPENAI',
  'GEMINI',
]);

/**
 * Splits a model's context window into the four quantities that were
 * previously one number.
 *
 * The single most consequential line in this file is that
 * `requestedOutputTokens` feeds `reservedOutputTokens` and nothing else. It was
 * previously the entire prompt budget, which is why a thread left at the 4096
 * default sent at most ~16k characters of everything — history, memories,
 * files and system prompt combined — to a model with a 256k window.
 */
export function resolveModelTokenBudget(input: ModelTokenBudgetInput): ModelTokenBudget {
  const { contextWindowTokens, source } = resolveContextWindow(
    input.contextWindowTokens,
    input.provider,
  );

  const reservedOutputTokens = clamp(
    input.requestedOutputTokens ?? Math.floor(contextWindowTokens * DEFAULT_OUTPUT_RESERVE_RATIO),
    MIN_RESERVED_OUTPUT_TOKENS,
    Math.min(MAX_RESERVED_OUTPUT_TOKENS, Math.floor(contextWindowTokens * 0.5)),
  );

  const overhead = Math.max(0, input.systemOverheadTokens) + Math.max(0, input.toolOverheadTokens);
  const available = contextWindowTokens - reservedOutputTokens - overhead;

  return {
    contextWindowTokens,
    reservedOutputTokens,
    systemOverheadTokens: Math.max(0, input.systemOverheadTokens),
    toolOverheadTokens: Math.max(0, input.toolOverheadTokens),
    availableInputTokens: Math.max(0, Math.min(available, MAX_HISTORY_INPUT_TOKENS)),
    source,
  };
}

function resolveContextWindow(
  fromCatalog: number | null | undefined,
  provider: string | null | undefined,
): { contextWindowTokens: number; source: ModelTokenBudget['source'] } {
  if (typeof fromCatalog === 'number' && fromCatalog > 0) {
    return { contextWindowTokens: fromCatalog, source: 'MODEL_CATALOG' };
  }
  if (
    provider !== null &&
    provider !== undefined &&
    LARGE_WINDOW_PROVIDERS.has(provider.toUpperCase())
  ) {
    return {
      contextWindowTokens: PROVIDER_DEFAULT_CONTEXT_WINDOW_TOKENS,
      source: 'PROVIDER_DEFAULT',
    };
  }
  return {
    contextWindowTokens: CONSERVATIVE_CONTEXT_WINDOW_TOKENS,
    source: 'CONSERVATIVE_FALLBACK',
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
