import { KNOWN_CONTEXT_WINDOWS } from './model-context-window.constants';

/**
 * The published input window for a known model family, or undefined.
 *
 * One table for the whole platform: connector-service fills synced models
 * from it, and routing-service answers from it when the catalog row has no
 * window, so chat-service budgets a 1M-token Gemini as 1M, not as 32k.
 */
export function knownContextWindow(provider: string, modelKey: string): number | undefined {
  const bare = modelKey
    .trim()
    .toLowerCase()
    .replace(/^models\//u, '')
    .replace(/:cloud$/u, '');
  const upper = provider.trim().toUpperCase();
  return KNOWN_CONTEXT_WINDOWS.find((entry) => entry.provider === upper && entry.pattern.test(bare))
    ?.tokens;
}
