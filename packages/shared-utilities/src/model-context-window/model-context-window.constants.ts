import type { KnownContextWindowEntry } from './model-context-window.types';

/**
 * Context windows for model families whose list API does not report one.
 *
 * OpenAI, Anthropic, DeepSeek and xAI list model ids only. Without a window
 * every one of their models reached chat-service as unknown and was budgeted
 * as 32k, so a 1M-token model was starved and nothing told a small one apart
 * (production, 2026-09-19: 156 of 175 catalog models had no window).
 *
 * First match wins, so a specific family sits above its general one. A value
 * reported by the provider itself (Gemini's native list, Ollama's /api/show)
 * always takes precedence over this table; it only fills the gaps. Numbers are
 * the providers' published input limits.
 */
export const KNOWN_CONTEXT_WINDOWS: readonly KnownContextWindowEntry[] = [
  { provider: 'OPENAI', pattern: /^gpt-4\.1/u, tokens: 1_047_576 },
  { provider: 'OPENAI', pattern: /^gpt-5/u, tokens: 400_000 },
  { provider: 'OPENAI', pattern: /^o[134](-|$)/u, tokens: 200_000 },
  { provider: 'OPENAI', pattern: /^gpt-4o/u, tokens: 128_000 },
  { provider: 'OPENAI', pattern: /^gpt-4-turbo/u, tokens: 128_000 },
  { provider: 'OPENAI', pattern: /^gpt-oss/u, tokens: 131_072 },
  { provider: 'OPENAI', pattern: /^gpt-4(-|$)/u, tokens: 8_192 },
  { provider: 'OPENAI', pattern: /^gpt-3\.5/u, tokens: 16_385 },
  { provider: 'ANTHROPIC', pattern: /^claude-/u, tokens: 200_000 },
  { provider: 'GEMINI', pattern: /^gemini-1\.5-pro/u, tokens: 2_097_152 },
  { provider: 'GEMINI', pattern: /^gemma/u, tokens: 131_072 },
  { provider: 'GEMINI', pattern: /^gemini-/u, tokens: 1_048_576 },
  { provider: 'DEEPSEEK', pattern: /^deepseek-/u, tokens: 65_536 },
  { provider: 'GROK', pattern: /^grok-4/u, tokens: 256_000 },
  { provider: 'GROK', pattern: /^grok-/u, tokens: 131_072 },
];
