import type { RouterAttemptRecord } from '../types/router-inference.types';

/**
 * Names the chain model whose answer the router used: `PROVIDER/model`.
 *
 * The cloud router never recorded this on the decision, so "Why this model?"
 * and the message showed only the model that ANSWERED, and an AUTO reply that
 * gpt-oss:120b routed to gpt-5.1 read as if OpenAI had routed it
 * (production, 2026-09-19). The last successful attempt is the one whose
 * decision was taken; a repair attempt counts, since its output was used.
 */
export function routerModelFromAttempts(attempts: readonly RouterAttemptRecord[]): string | null {
  const used = [...attempts].reverse().find((attempt) => attempt.outcome === 'SUCCESS');
  return used === undefined ? null : `${used.provider}/${used.providerModelId}`;
}
