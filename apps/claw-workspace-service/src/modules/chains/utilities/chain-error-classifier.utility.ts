import type { WorkspaceChainStepErrorClass } from '../../../generated/prisma';

/**
 * Classifies a chain step failure message into the pack's Phase 06 error
 * taxonomy (transient / auth / rate-limit / validation / permission /
 * conflict / permanent), reusing the same message-pattern approach
 * WorkspaceSyncManager.classifyError already uses for sync runs — pattern
 * reused, not duplicated logic, since chain step failures come from a wider
 * range of sources (RBAC denial, unresolved DSL placeholders, provider
 * HTTP errors) than a read-only sync's failures do, so the exact category
 * set differs.
 *
 * This only classifies AFTER a failure — it does not decide whether to
 * retry. Phase 05 deliberately does not auto-retry the write-action call
 * itself (see ChainExecutorManager.resume's doc comment); this taxonomy
 * exists so a human deciding whether to call resume() knows whether the
 * failure is worth retrying at all (TRANSIENT/RATE_LIMIT) versus needing a
 * different fix first (AUTH → reconnect; VALIDATION/PERMISSION → fix the
 * chain definition or grant; PERMANENT → resuming will just fail again).
 */
export function classifyChainStepError(message: string): WorkspaceChainStepErrorClass {
  const lower = message.toLowerCase();

  if (lower.includes('unresolved placeholders')) {
    return 'VALIDATION';
  }
  if (
    lower.includes('no access to connector') ||
    lower.includes('403') ||
    lower.includes('forbidden')
  ) {
    return 'PERMISSION';
  }
  if (
    lower.includes('401') ||
    lower.includes('unauthorized') ||
    lower.includes('could not resolve a valid token') ||
    lower.includes('missing or unauthenticated')
  ) {
    return 'AUTH';
  }
  if (lower.includes('429') || lower.includes('rate') || lower.includes('throttl')) {
    return 'RATE_LIMIT';
  }
  if (lower.includes('409') || lower.includes('conflict') || lower.includes('already exists')) {
    return 'CONFLICT';
  }
  if (lower.includes('400') || lower.includes('invalid') || lower.includes('validation')) {
    return 'VALIDATION';
  }
  if (
    /\b50[0-9]\b/.test(lower) ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset')
  ) {
    return 'TRANSIENT';
  }
  return 'PERMANENT';
}
